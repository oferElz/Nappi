# Nappi IoT layer

This repository contains the **embedded-side code** used in the Nappi PoC, split into two parts:

## Folder structure

- **`M5 Unit V2 ML AI camera`**  
  UnitV2 camera scripts and setup:
  - Stage A: **timelapse** image collection to SD card (dataset building)
  - Stage B: **TinyML inference** using a Teachable Machine `model.tflite + labels.txt`  
  Includes a dedicated README inside the folder.

- **`M5Stack Core 2/`**  
  M5Stack Core2 controller code:
  - Reads **noise (built-in mic)** + **ENV.III (temp/humidity)**
  - Reads **camera verdict** over UART
  - Runs a small **HTTP server** for backend polling and triggers events  
  Includes a dedicated README inside the folder.

## Notes
Each folder contains its own `README.md` with the full process, wiring, and important paths.
