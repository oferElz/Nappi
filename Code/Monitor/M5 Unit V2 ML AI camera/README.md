# M5 UnitV2 ML AI Camera – Timelapse ➜ TinyML (Nappi PoC)

This folder documents how we worked with the **M5 UnitV2 ML AI Camera** in two practical stages:

1. **Timelapse data collection** – automatically capture and save image sessions to an SD card (for building a dataset).
2. **TinyML inference (Nappi PoC)** – train a lightweight classifier with **Google Teachable Machine**, deploy it to the UnitV2, and run inference automatically on power‑on.

---

## What’s in this folder (Git)

Current files (as shown in the repo):

- `timelapse.py` – captures images periodically and saves them into a new session folder on the SD card (old file on camera).
- `my_app.txt` – the TinyML inference script used in nappi final code.

---

## UnitV2 device paths (where things live on the camera)

- Startup script (auto-run on boot): `/etc/init.d/S85runpayload`
- Timelapse script(stage 1 camera code): `/home/m5stack/timelapse.py`
- TinyML script(stage 2 camera code): `/home/m5stack/my_app.py`
- Teachable Machine export:
  - Model: `/home/notebook/model.tflite`
  - Labels: `/home/notebook/labels.txt`

---

## Stage A — Timelapse data collection (dataset building)

### Goal
Create a simple workflow to collect training images:
- our caregiving persona connects the UnitV2 to power
- the script starts automatically (no web UI actions)
- images are saved to SD card in a **new folder per session**
- later, these images are labeled and used for TinyML training
<p align="center">
  <img src="https://github.com/user-attachments/assets/01503c5c-7aa8-4f9d-95de-afaecb2d5cee" alt="infant data crib sd screenshot" width="500"/>
</p>

### How `timelapse.py` works
Key behavior:
- waits 15s (gives SD time to mount)
- expects SD at: `SD_PATH = "/media/sdcard"`
- creates a unique folder per session: `TIMELAPSE_YYYYMMDD_HHMMSS` (adds `_1`, `_2`, … if needed)
- continuously reads frames to avoid “stale buffer” images
- saves a JPG every `SAVE_INTERVAL` seconds (default: 5s)
- uses `os.fsync(...)` after each write to reduce SD write issues

### Auto-run on power‑on (timelapse)
To make the UnitV2 start timelapse on boot, `S85runpayload` was set to run `timelapse.py`.

**`/etc/init.d/S85runpayload` (timelapse version):**
```sh
#!/bin/sh

case "$1" in
    start)
        # Run timelapse.py in background & save logs
        # -u means "unbuffered" so logs update instantly
        python3 -u /home/m5stack/timelapse.py > /home/m5stack/timelapse_log.txt 2>&1 &
        ;;
    stop)
        # Force kill python to free the camera
        killall -9 python3
        ;;
    restart|reload)
        $0 stop
        $0 start
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
esac

exit 0
```

Result: each time the UnitV2 is powered, it starts collecting images and saving them to the SD card automatically(and not auto-open camera web interface).

---

## Stage B — TinyML inference for Nappi (PoC)

### Dataset ➜ Google Teachable Machine
After collecting timelapse sessions, the images were moved to a PC and labeled into 3 classes:

- Awake
- Asleep
- No Baby Found

Then we used this image for Teachable Machine image classifier and exported as **TensorFlow Lite**  **(Quantized)**

### Deploy model to the UnitV2
The exported files were placed on the UnitV2 under:

- `/home/notebook/model.tflite`
- `/home/notebook/labels.txt`

Example `labels.txt` (as used on the device):
```
0 Asleep
1 Awake
2 No Baby Found
```

### `my_app.py` (TinyML inference)
The inference script:
- loads the TFLite model and labels from `/home/notebook/`
- captures a frame from the UnitV2 camera (`cv2.VideoCapture(0)`)
- resizes to the model input size
- runs inference (`tflite_runtime.interpreter`)
- picks the class with `argmax`
- sends a compact JSON payload over UART:
  ```json
  {"verdict":"No Baby Found","conf":100}
  ```

#### Forced override mode (testing without a real baby)
`my_app.py` supports forcing a class by changing one line:

```py
FORCED_CLASS_INDEX = 2
```

- `None` = normal classification
- `0` = force Awake
- `1` = force Asleep
- `2` = force No Baby Found

This was used for validation runs of sensors data polling without relying on real camera content.

### Auto-run on power‑on (TinyML)
To switch from timelapse to TinyML on boot, `S85runpayload` was updated to run `my_app.py`.

**`/etc/init.d/S85runpayload` (TinyML version):**
```sh
#!/bin/sh

case "$1" in
        start)
                printf "Starting AI App: "
                cd /home/m5stack
                # Run the app in background & save logs to my_log.txt
                python3 /home/m5stack/my_app.py > /home/m5stack/my_log.txt 2>&1 &
                [ $? = 0 ] && echo "OK" || echo "FAIL"
                ;;
        stop)
                printf "Stopping AI App: "
                # Force kill python to ensure camera is freed
                killall -9 python3
                [ $? = 0 ] && echo "OK" || echo "FAIL"
                ;;
        restart|reload)
                $0 stop
                $0 start
                ;;
        *)
                echo "Usage: $0 {start|stop|restart}"
                exit 1
esac

exit 0
```

---
