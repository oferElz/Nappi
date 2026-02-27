import cv2
import time
import os
import datetime

# --- Configuration ---
SD_PATH = '/media/sdcard'
SAVE_INTERVAL = 5

def get_unique_folder(base_path):
    # 1. Start with the standard name based on current time
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    folder_name = 'TIMELAPSE_' + timestamp
    full_path = os.path.join(base_path, folder_name)

    # 2. If it doesn't exist, use it
    if not os.path.exists(full_path):
        return full_path

    # 3. If it DOES exist (Duplicate found!), add _1, _2, _3 until safe
    counter = 1
    while True:
        new_name = f"{folder_name}_{counter}"
        new_path = os.path.join(base_path, new_name)
        if not os.path.exists(new_path):
            return new_path
        counter += 1

def main():
    # Wait 15s to let the SD card "mount" properly if it wasn't ejected safely last time
    time.sleep(15)

    if not os.path.exists(SD_PATH):
        print("Error: SD Card not found at " + SD_PATH)
        return

    # Use get_unique_folder function to get a safe folder name
    save_dir = get_unique_folder(SD_PATH)

    try:
        os.makedirs(save_dir)
        print("Created folder: " + save_dir)
    except OSError as e:
        print("Error creating folder: ", e)
        return

    # Initialize Camera
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    time.sleep(2)

    if not cap.isOpened():
        print("Cannot open camera")
        return

    print("Starting Timelapse...")

    count = 1
    last_save_time = time.time()

    try:
        while True:
            # Constant read to keep buffer fresh
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            # Check if 5 seconds have passed
            current_time = time.time()
            if current_time - last_save_time >= SAVE_INTERVAL:
                filename = os.path.join(save_dir, 'img_{}.jpg'.format(count))

                # Write image with maximum quality (100)
                success = cv2.imwrite(filename, frame, [cv2.IMWRITE_JPEG_QUALITY, 100])

                if success:
                    # Force OS to flush write buffer to SD card
                    try:
                        with open(filename, 'rb') as f:
                            os.fsync(f.fileno())
                        print("Saved and synced: " + filename)
                    except Exception as e:
                        print("Error syncing {}: {}".format(filename, e))
                else:
                    print("Failed to write " + filename)

                count += 1
                last_save_time = current_time

                # Give SD card time to complete the write operation
                time.sleep(0.3)

            # Tiny sleep to prevent overheating
            time.sleep(0.05)

    except KeyboardInterrupt:
        print("Timelapse stopped by user")
    except Exception as e:
        print("Unexpected error: {}".format(e))
    finally:
        cap.release()
        print("Camera released. Total images captured: {}".format(count - 1))

if __name__ == '__main__':
    main()