"""
Nappi Baby Monitor - M5Stack Core2 Controller
==============================================
Hardware:
  - M5Stack Core2 (built-in mic used)
  - M5 Unit v2 ML AI Camera -> connected via UART (Port C: RX=GPIO13, TX=GPIO14)
  - M5 ENV.III Unit (SHT30 QMP6988) -> connected via I2C (Port A: SDA=GPIO32, SCL=GPIO33)

What this code does:
  1. Reads noise level (dB) from built-in mic
  2. Reads temperature & humidity from ENV.III over I2C
  3. Reads ML verdict JSON from AI Camera over UART
  4. Detects state transitions (Awake/Asleep/No Baby Found)
     with confidence-weighted debouncing before firing events
  5. Runs an HTTP server on port 8001 for the backend to poll sensor data
  6. Auto-reconnects WiFi on drop; gc.collect() every loop

Backend endpoints triggered:
  POST /sensor/sleep-start  -- when camera transitions to "Asleep"
  POST /sensor/sleep-end    -- when camera transitions from "Asleep" to "Awake"
  POST /sensor/baby-away    -- when camera sees "No Baby Found" after sleep/awake

HTTP server endpoints served (backend polls these):
  GET /sensor-data           -- combined JSON (for mock/testing)
  GET /temperature/{baby_id} -- {"value": float}
  GET /humidity/{baby_id}    -- {"value": float}
  GET /noise_decibel/{baby_id} -- {"value": float}
"""

import M5
from M5 import *
import gc
import time
import math
import json
import socket
import machine
import network
import requests as urequests

# ================================================================
#  CONFIGURATION 
# ================================================================
WIFI_SSID     = "ofer_phone"
WIFI_PASSWORD = "OferOran"

BACKEND_URL   = "http://192.168.1.100:8000"   # Nappi backend ip before render deployment
BABY_ID       = 10                             # Baby ID in the backend DB
SERVER_PORT   = 8001                           # Matches backend SENSOR_API_BASE_URL default

# Mic calibration (using sound level meter app)
SAMPLE_RATE   = 8000
CHUNK_MS      = 60
OFFSET_DB     = 75.0   # Calibration offset

# UART from AI Camera (Port C)
UART_RX_PIN   = 13
UART_TX_PIN   = 14
UART_BAUD     = 115200

# ENV.III I2C (Port A on Core2)
I2C_SDA_PIN   = 32
I2C_SCL_PIN   = 33
SHT30_ADDR    = 0x44

# Camera verdict debouncing
DEBOUNCE_WINDOW_S  = 25.0   # Sliding window: 25 seconds (~12 readings)
DEBOUNCE_THRESHOLD = 600    # Min confidence sum to act

# WiFi reconnection
WIFI_RECONNECT_RETRIES = 10

# Demo Sensors verification mode: bypass camera, auto sleep-start then sleep-end after DEMO_SLEEP_S
DEMO_MODE    = False
DEMO_SLEEP_S = 180
# ================================================================

# ---------- Global shared state ----------
sensor_data = {
    "temperature":  None,   # °C
    "humidity":     None,   # %
    "noise_db":     None,   # dBSPL
    "verdict":      "No Baby Found",
    "confidence":   0,
}
current_state = "away"   # "awake" | "asleep" | "away"
# Single-threaded (no background thread) — dummy lock for code compatibility
class _DummyLock:
    def __enter__(self): return self
    def __exit__(self, *a): pass
data_lock = _DummyLock()

# ---------- UI widgets ----------
lbl_temp  = None
lbl_hum   = None
lbl_noise = None
lbl_state = None
lbl_cam   = None

# ---------- Mic buffer (allocated in setup) ----------
mic_buf = None


# ================================================================
#  WIFI  (with reconnection)
# ================================================================
_wlan = None

def connect_wifi():
    global _wlan
    _wlan = network.WLAN(network.STA_IF)
    _wlan.active(True)
    if _wlan.isconnected():
        print("WiFi already connected:", _wlan.ifconfig()[0])
        return _wlan.ifconfig()[0]

    print(f"Connecting to WiFi: {WIFI_SSID}")
    _wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    for _ in range(20):
        if _wlan.isconnected():
            ip = _wlan.ifconfig()[0]
            print(f"WiFi connected: {ip}")
            return ip
        time.sleep(1)

    print("WiFi connection FAILED")
    return None

def ensure_wifi():
    """Check WiFi every loop. Reconnect if dropped. Hard-reset after repeated failure."""
    if _wlan is None:
        return
    if _wlan.isconnected():
        return

    print("[wifi] Connection lost — reconnecting...")
    _wlan.disconnect()
    time.sleep_ms(100)
    _wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    for attempt in range(WIFI_RECONNECT_RETRIES):
        if _wlan.isconnected():
            print(f"[wifi] Reconnected after {attempt + 1} attempts")
            return
        time.sleep(1)

    print("[wifi] Reconnection failed — hard resetting device")
    machine.reset()


# ================================================================
#  ENV.III  (SHT30 over I2C)
# ================================================================
_i2c = None

def init_env3():
    global _i2c
    _i2c = machine.SoftI2C(scl=machine.Pin(I2C_SCL_PIN),
                            sda=machine.Pin(I2C_SDA_PIN),
                            freq=100000)
    devices = _i2c.scan()
    if SHT30_ADDR not in devices:
        print(f"WARNING: SHT30 not found. Devices on bus 1: {[hex(d) for d in devices]}")
    else:
        print(f"ENV.III SHT30 found at 0x{SHT30_ADDR:02X}")

def read_sht30():
    """Read temperature (°C) and humidity (%) from SHT30."""
    if _i2c is None:
        return None, None
    try:
        _i2c.writeto(SHT30_ADDR, bytes([0x2C, 0x06]))
        time.sleep_ms(50)
        raw = _i2c.readfrom(SHT30_ADDR, 6)
        temp_raw = (raw[0] << 8) | raw[1]
        hum_raw  = (raw[3] << 8) | raw[4]
        temp = round(-45.0 + 175.0 * temp_raw / 65535.0, 1)
        hum  = round(100.0 * hum_raw / 65535.0, 1)
        return temp, hum
    except Exception as e:
        print(f"SHT30 read error: {e}")
        return None, None


# ================================================================
#  MICROPHONE
# ================================================================
def analyze_pcm16_le_peak_dbfs(b):
    """Signed 16-bit little-endian peak -> dBFS."""
    n = len(b)
    if n < 2:
        return -120.0
    peak = 0
    for i in range(0, n - 1, 2):
        v = b[i] | (b[i + 1] << 8)
        if v >= 32768:
            v -= 65536
        av = v if v >= 0 else -v
        if av > peak:
            peak = av
    return 20.0 * math.log10((peak + 1e-9) / 32767.0)

def read_mic_db():
    """Record a chunk and return calibrated dBSPL estimate."""
    global mic_buf
    Mic.record(mic_buf, SAMPLE_RATE, False)
    while Mic.isRecording():
        time.sleep_ms(2)
    dbfs = analyze_pcm16_le_peak_dbfs(mic_buf)
    return round(dbfs + OFFSET_DB, 1)


# ================================================================
#  CAMERA UART  (receives JSON from my_app.py on the unit V2 ML AI Camera)
# ================================================================
_uart_cam = None

def init_uart():
    global _uart_cam
    _uart_cam = machine.UART(1,
                              baudrate=UART_BAUD,
                              rx=UART_RX_PIN,
                              tx=UART_TX_PIN,
                              rxbuf=1024)
    print(f"Camera UART ready (RX={UART_RX_PIN}, TX={UART_TX_PIN}, rxbuf=1024)")

def _normalize_verdict(raw):
    """
    Camera labels file has format '0 Asleep', '1 Awake', '2 No Baby Found'.
    Strip the leading index prefix so we get 'Asleep', 'Awake', 'No Baby Found'.
    """
    if raw and len(raw) > 2 and raw[0].isdigit() and raw[1] == " ":
        return raw[2:]
    return raw

def parse_camera_uart():
    """
    Drain all pending UART lines, update sensor_data with the latest
    verdict+confidence, and return list of (verdict, confidence) tuples
    for all lines received this tick.
    """
    if _uart_cam is None:
        return []
    results = []
    while _uart_cam.any():
        try:
            line = _uart_cam.readline()
            if not line:
                break
            payload = json.loads(line.decode().strip())
            raw_verdict = payload.get("verdict", None)
            confidence  = payload.get("conf", 0)
            verdict = _normalize_verdict(raw_verdict)
            if verdict is not None:
                with data_lock:
                    sensor_data["verdict"]    = verdict
                    sensor_data["confidence"] = confidence
                results.append((verdict, confidence))
        except Exception:
            pass
    return results


# ================================================================
#  VERDICT DEBOUNCER  (confidence-weighted majority vote)
# ================================================================
class VerdictDebouncer:
    """
    Sliding time-window with confidence-weighted voting and dominance check.
    Two conditions must both be met before triggering a state change:
      1. Winning verdict's total confidence >= DEBOUNCE_THRESHOLD
      2. Winning verdict's count >= 3x the count of every other verdict
    """
    def __init__(self, window_s, threshold):
        self._window_ms = int(window_s * 1000)
        self._threshold = threshold
        self._buffer = []

    def feed(self, verdict, confidence):
        """
        Add a reading and return the debounced verdict if consensus
        is reached, or None if not enough confidence yet.
        """
        now = time.ticks_ms()
        self._buffer.append((now, verdict, confidence))

        # Prune entries older than the window
        cutoff = time.ticks_add(now, -self._window_ms)
        self._buffer = [(t, v, c) for t, v, c in self._buffer
                        if time.ticks_diff(t, cutoff) >= 0]

        # Count occurrences and sum confidence per verdict
        counts = {}
        scores = {}
        for _, v, c in self._buffer:
            counts[v] = counts.get(v, 0) + 1
            scores[v] = scores.get(v, 0) + c

        if not counts:
            return None

        # Find winner by count
        best = max(counts, key=counts.get)
        best_count = counts[best]
        best_score = scores[best]

        # Check dominance: winner count must be >= 3x every other verdict's count
        for v, cnt in counts.items():
            if v != best and best_count < cnt * 3:
                return None   # not dominant enough yet

        if best_score >= self._threshold:
            return best
        return None

verdict_debouncer = VerdictDebouncer(DEBOUNCE_WINDOW_S, DEBOUNCE_THRESHOLD)


# ================================================================
#  STATE MACHINE - triggers backend POST events
# ================================================================
def post_event(endpoint):
    """Fire a POST to the Nappi backend."""
    url = f"{BACKEND_URL}/sensor/{endpoint}"
    body = json.dumps({"baby_id": BABY_ID})
    try:
        r = urequests.post(url, data=body,
                           headers={"Content-Type": "application/json"},
                           timeout=5)
        print(f"[backend] POST /sensor/{endpoint} -> HTTP {r.status_code}")
        r.close()
    except Exception as e:
        print(f"[backend] POST /sensor/{endpoint} FAILED: {e}")

def handle_state_transition(new_verdict):
    """
    Update the sleep state machine and fire backend events on transitions.

    Transitions:
      any   -> Asleep           → POST sleep-start
      Asleep -> Awake           → POST sleep-end
      Asleep/Awake -> No Baby   → POST baby-away
      (No Baby -> Awake/Asleep handled as fresh start)
    """
    global current_state

    if new_verdict is None:
        return

    prev = current_state

    if new_verdict == "Asleep":
        if prev != "asleep":
            current_state = "asleep"
            print(f"[state] {prev} -> asleep  (firing sleep-start)")
            post_event("sleep-start")

    elif new_verdict == "Awake":
        if prev == "asleep":
            current_state = "awake"
            print(f"[state] asleep -> awake  (firing sleep-end)")
            post_event("sleep-end")
        elif prev == "away":
            current_state = "awake"
            print(f"[state] away -> awake")

    elif new_verdict == "No Baby Found":
        if prev in ("asleep", "awake"):
            current_state = "away"
            print(f"[state] {prev} -> away  (firing baby-away)")
            post_event("baby-away")
        else:
            current_state = "away"


# ================================================================
#  HTTP SERVER  (serves sensor data to the backend)
# ================================================================
def _build_response(body_dict, status=200):
    body = json.dumps(body_dict)
    return (
        f"HTTP/1.1 {status} OK\r\n"
        f"Content-Type: application/json\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"Connection: close\r\n\r\n"
        f"{body}"
    )

def _extract_baby_id(path):
    """Extract baby_id from path like '/temperature/10'. Returns int or None."""
    segments = path.strip("/").split("/")
    if len(segments) >= 2:
        try:
            return int(segments[-1])
        except ValueError:
            pass
    return None

def _handle_http_client(conn):
    try:
        request = conn.recv(512).decode("utf-8", "ignore")
        if not request:
            return
        first_line = request.split("\r\n")[0]
        parts = first_line.split(" ")
        if len(parts) < 2:
            return
        path = parts[1].split("?")[0]   # strip query string

        with data_lock:
            snap = dict(sensor_data)
        state_snap = current_state

        resp = None

        # Combined endpoint (test path)
        if path == "/sensor-data":
            resp = _build_response({
                "baby_id":      BABY_ID,
                "temperature":  snap["temperature"],
                "humidity":     snap["humidity"],
                "noise_db":     snap["noise_db"],
                "verdict":      snap["verdict"],
                "confidence":   snap["confidence"],
                "sleep_state":  state_snap,
            })

        # Individual endpoints (real usage)
        elif path.startswith("/temperature/"):
            req_id = _extract_baby_id(path)
            if req_id is not None and req_id != BABY_ID:
                resp = _build_response({"error": f"This device monitors baby {BABY_ID}"}, 404)
            else:
                resp = _build_response({"value": snap["temperature"]})

        elif path.startswith("/humidity/"):
            req_id = _extract_baby_id(path)
            if req_id is not None and req_id != BABY_ID:
                resp = _build_response({"error": f"This device monitors baby {BABY_ID}"}, 404)
            else:
                resp = _build_response({"value": snap["humidity"]})

        elif path.startswith("/noise_decibel/"):
            req_id = _extract_baby_id(path)
            if req_id is not None and req_id != BABY_ID:
                resp = _build_response({"error": f"This device monitors baby {BABY_ID}"}, 404)
            else:
                resp = _build_response({"value": snap["noise_db"]})

        if resp is None:
            resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"

        conn.sendall(resp.encode())
    except Exception as e:
        print(f"[http] client error: {e}")
    finally:
        conn.close()

# Global non-blocking server socket (created in setup, polled in loop)
_srv_sock = None

def init_http_server():
    """
    Create a non-blocking server socket.
    """
    global _srv_sock

    # Close any socket left open by a previous run of this script
    if _srv_sock is not None:
        try:
            _srv_sock.close()
            print("[http] Closed previous socket")
        except Exception:
            pass
        _srv_sock = None
        time.sleep_ms(200)

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", SERVER_PORT))
        s.listen(1)
        s.setblocking(False)
        _srv_sock = s
        print(f"[http] Server listening on :{SERVER_PORT}")
    except OSError as e:
        print(f"[http] ERROR: Could not bind socket: {e} — HTTP server disabled")
        _srv_sock = None

def poll_http_server():
    """Call once per main loop tick to service any waiting HTTP client."""
    if _srv_sock is None:
        return
    try:
        conn, addr = _srv_sock.accept()   # returns immediately if no client
        _handle_http_client(conn)
    except OSError:
        pass   # no client waiting — normal, ignore


# ================================================================
#  DISPLAY HELPERS
# ================================================================
def init_display():
    global lbl_temp, lbl_hum, lbl_noise, lbl_state, lbl_cam
    Widgets.setRotation(1)
    Widgets.fillScreen(0x001530)

    # Title
    Widgets.Label("Nappi Monitor", 5, 5, 1.0,
                  0x00AAFF, 0x001530, Widgets.FONTS.DejaVu18)

    # Row labels (static)
    Widgets.Label("Temp:",    5,  40, 1.0, 0xAAAAAA, 0x001530, Widgets.FONTS.DejaVu18)
    Widgets.Label("Humid:",   5,  65, 1.0, 0xAAAAAA, 0x001530, Widgets.FONTS.DejaVu18)
    Widgets.Label("Noise:",   5,  90, 1.0, 0xAAAAAA, 0x001530, Widgets.FONTS.DejaVu18)
    Widgets.Label("Camera:",  5, 115, 1.0, 0xAAAAAA, 0x001530, Widgets.FONTS.DejaVu18)
    Widgets.Label("State:",   5, 140, 1.0, 0xAAAAAA, 0x001530, Widgets.FONTS.DejaVu18)

    # Dynamic value labels
    lbl_temp  = Widgets.Label("--",  100,  40, 1.0, 0xFFFFFF, 0x001530, Widgets.FONTS.DejaVu18)
    lbl_hum   = Widgets.Label("--",  100,  65, 1.0, 0xFFFFFF, 0x001530, Widgets.FONTS.DejaVu18)
    lbl_noise = Widgets.Label("--",  100,  90, 1.0, 0xFFFFFF, 0x001530, Widgets.FONTS.DejaVu18)
    lbl_cam   = Widgets.Label("--",  100, 115, 1.0, 0xFFEE00, 0x001530, Widgets.FONTS.DejaVu18)
    lbl_state = Widgets.Label("--",  100, 140, 1.0, 0x00FF88, 0x001530, Widgets.FONTS.DejaVu18)

def update_display():
    with data_lock:
        snap = dict(sensor_data)

    t = f"{snap['temperature']} C"   if snap['temperature'] is not None else "--"
    h = f"{snap['humidity']} %"      if snap['humidity']    is not None else "--"
    n = f"{snap['noise_db']} dB"     if snap['noise_db']    is not None else "--"
    c = f"{snap['verdict']} ({snap['confidence']}%)"
    s = current_state.upper()

    # Colour-code state
    state_colour = {
        "asleep":  0x00FF88,
        "awake":   0xFFAA00,
        "away":    0xFF4444,
    }.get(current_state, 0xFFFFFF)

    lbl_temp .setText(t)
    lbl_hum  .setText(h)
    lbl_noise.setText(n)
    lbl_cam  .setText(c)
    lbl_state.setText(s)


# ================================================================
#  SETUP & MAIN LOOP
# ================================================================
def setup():
    global mic_buf

    M5.begin()
    init_display()

    # --- WiFi ---
    ip = connect_wifi()
    if ip:
        Widgets.Label(ip, 5, 170, 1.0, 0x444444, 0x001530, Widgets.FONTS.DejaVu18)
    else:
        Widgets.Label("No WiFi!", 5, 170, 1.0, 0xFF0000, 0x001530, Widgets.FONTS.DejaVu18)

    # --- ENV.III ---
    init_env3()

    # --- Microphone ---
    Speaker.end()
    if not Mic.begin():
        print("ERROR: Mic init failed")
    samples = int(SAMPLE_RATE * CHUNK_MS / 1000)
    mic_buf = bytearray(samples * 2)

    # --- Camera UART ---
    if not DEMO_MODE:
        init_uart()
    else:
        print("[demo] Camera bypassed — demo mode active")

    # --- HTTP server (non-blocking, polled in main loop) ---
    init_http_server()

    print("Nappi Baby Monitor ready")
    print(f"  Baby ID: {BABY_ID}")
    print(f"  HTTP server: :{SERVER_PORT}")
    print(f"  Backend: {BACKEND_URL}")
    if DEMO_MODE:
        print(f"  DEMO MODE: sleep {DEMO_SLEEP_S}s then wake")
    else:
        print(f"  Debounce: window={DEBOUNCE_WINDOW_S}s, threshold={DEBOUNCE_THRESHOLD}")


def loop():
    M5.update()

    # 0) Ensure WiFi is alive — reconnect if dropped
    ensure_wifi()

    # 1) Read microphone
    try:
        noise = read_mic_db()
        with data_lock:
            sensor_data["noise_db"] = noise
    except Exception as e:
        print(f"[mic] error: {e}")

    # 2) Read ENV.III (temp + humidity)
    temp, hum = read_sht30()
    if temp is not None:
        with data_lock:
            sensor_data["temperature"] = temp
            sensor_data["humidity"]    = hum

    # 3) Drain camera UART & feed through debouncer
    if not DEMO_MODE:
        cam_readings = parse_camera_uart()
        for verdict, confidence in cam_readings:
            debounced = verdict_debouncer.feed(verdict, confidence)
            if debounced is not None:
                handle_state_transition(debounced)

    # 4) Debug: print full aggregated JSON to serial
    with data_lock:
        debug_payload = dict(sensor_data)
    debug_payload["sleep_state"] = current_state
    print("DEBUG:", json.dumps(debug_payload))

    # 5) Service any pending HTTP request (non-blocking)
    poll_http_server()

    # 6) Refresh display
    update_display()

    # 7) Garbage collection — prevent memory fragmentation
    gc.collect()

    time.sleep_ms(500)


if __name__ == "__main__":
    setup()

    if DEMO_MODE:
        print("[demo] Firing sleep-start...")
        handle_state_transition("Asleep")
        with data_lock:
            sensor_data["verdict"] = "Asleep"
            sensor_data["confidence"] = 100

        demo_start = time.ticks_ms()
        demo_end_ms = DEMO_SLEEP_S * 1000

        while True:
            elapsed = time.ticks_diff(time.ticks_ms(), demo_start)

            if elapsed >= demo_end_ms and current_state == "asleep":
                print(f"[demo] {DEMO_SLEEP_S}s elapsed — firing sleep-end...")
                with data_lock:
                    sensor_data["verdict"] = "Awake"
                    sensor_data["confidence"] = 100
                handle_state_transition("Awake")
                # Run a few more loops so backend can poll the final state
                for _ in range(10):
                    loop()
                print("[demo] Done.")
                break

            loop()
    else:
        # --- Normal production loop ---
        while True:
            loop()
