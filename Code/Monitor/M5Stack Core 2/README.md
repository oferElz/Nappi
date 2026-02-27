# M5Stack Core2 Controller (Nappi PoC)

This folder documents the **M5Stack Core2** side of the Nappi PoC: how we moved from a simple demo in order to learn the pipeline into the final controller code that reads sensors, consumes the UnitV2 camera verdict, and exposes data to the backend.

---

## What’s in this folder (Git)

* `m5stack_final.py` – **final** controller code used in Nappi

---

## Hardware wiring (Core2)

* **M5Stack Core2**
  * Built-in mic (used for noise / dB)
* **M5 UnitV2 ML AI Camera** (TinyML classifier)
  * UART on **Port C**
  * Core2 pins: `RX=GPIO13`, `TX=GPIO14`
* **M5 ENV.III (SHT30 QMP6988)**
  * I2C on **Port A**
  * Core2 pins: `SDA=GPIO32`, `SCL=GPIO33`

---

## Stage A - “Learning” demo (hand open/close)

### Goal

Before connecting everything to Nappi, we built a small demo to validate the basic flow:

**UnitV2 camera → UART JSON → Core2 screen**

### What the old demo did

* Open UART on Core2 (to the camera)
* Read a JSON line sent by the camera
* Update labels on screen (verdict + a value)

Short snipet of old code:

```python
# UART Setup (Port C on Core2: TX=14, RX=13)
uart_cam = machine.UART(2, tx=14, rx=13, baudrate=115200)

# In loop:
if uart_cam.any():
    line = uart_cam.readline()
    data = json.loads(line)
    label_verdict.setText(str(data['verdict']))
```

### Mic note (what changed later)

At the beginning we also explored using **the camera-side mic** for noise, but it was **too sensitive** and the values jumped a lot.
So in the final design we measured noise using the **Core2 built-in mic**, which was more stable and easier to calibrate for our PoC.

---
<p align="center">
  <img src="https://github.com/user-attachments/assets/211280a2-3bfe-436d-ac83-9b7f103e5db0" alt="sensors pooling in demo mode" width="300"/>
</p>

## Stage B — Final Nappi controller (Core2 main code)

### Goal

Turn the Core2 into a “single controller loop” that:

1. Reads **noise** (Core2 mic)
2. Reads **temperature & humidity** (ENV.III over I2C)
3. Reads **TinyML verdict** (UnitV2 over UART)
4. Debounces verdict changes and triggers backend events
5. Runs a small **HTTP server** for the backend to poll current sensor values

### What the final code does (high level)

#### 1) Sensor reads

* **Noise (Core2 mic)**
  * Records a small PCM chunk, converts to peak dBFS, then applies an offset `OFFSET_DB` to estimate dB.
* **ENV.III (SHT30 over I2C)**
  * Reads temperature (°C) and humidity (%).

#### 2) Camera UART ingestion

* Reads JSON lines from the UnitV2 camera, example:

  ```json
  {"verdict":"No Baby Found","conf":100}
  ```
* Normalizes verdict text (labels look like `0 Asleep`, `1 Awake`, `2 No Baby Found`).

#### 3) Confidence-weighted debouncing

Raw camera predictions can flicker.
To avoid false state changes, the code uses a **sliding time window** and only accepts a verdict if:

* the winning class is dominant (by count), and
* the total confidence is high enough

This is what prevents “one noisy frame” from triggering a sleep event.

#### 4) State machine + backend events

The Core2 maintains a `current_state`:

* `awake`
* `asleep`
* `away`

Transitions trigger backend POST calls:

* `→ Asleep`  → `POST /sensor/sleep-start`
* `Asleep → Awake` → `POST /sensor/sleep-end`
* `Awake/Asleep → No Baby Found` → `POST /sensor/baby-away`

#### 5) HTTP server for polling

The Core2 hosts a lightweight HTTP server (port **8001**) so the backend can poll sensor values.

Served endpoints:

* `GET /temperature/{baby_id}` → `{"value": float}`
* `GET /humidity/{baby_id}` → `{"value": float}`
* `GET /noise_decibel/{baby_id}` → `{"value": float}`
* `GET /sensor-data` → combined JSON (useful for testing)

---

## Auto-run on power-on (M5Stack)

Unlike the UnitV2 (which uses `/etc/init.d/S85runpayload`), the Core2 runs MicroPython/UIFlow scripts on boot by using the **boot/main entry file**.

Common approach (UIFlow2 / MicroPython style):

* Save the final script as `main.py` on the device filesystem (often `/flash/main.py`)
* Or use the UIFlow2 “run on boot / save to device” workflow so the program starts automatically after restart

> In our setup, the Core2 is intended to start running immediately after power is connected (same idea as the camera side).

---

## Demo / Validation mode (no real camera needed)

The final code supports a **DEMO mode** (camera bypass) to validate:

* sensor polling
* backend connectivity
* sleep-start / sleep-end timing

This was useful when we wanted to test the pipeline without relying on real camera inference.
<p align="center">
  <img src="https://github.com/user-attachments/assets/aa509d81-10b9-4625-aef1-ca6b8c56a1bf" alt="sensors pooling in demo mode" width="300"/>
</p>

---

## Practical notes / lessons from the PoC

* **Single-thread loop**: Everything runs in one loop tick (including polling HTTP). This is simple and stable and proved valid.
* **Wi-Fi drops**: The code actively checks Wi-Fi and reconnects, after repeated failures it resets the device.
* **Mic calibration**: Noise reading is based on a calibrated offset (`OFFSET_DB`) since raw dBFS isn’t dBSPL.

---
