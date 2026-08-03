import cv2
import numpy as np
import os
import math

FILE_PATH = "input.jpg" # 送信したい巨大ファイル

GRID_SIZE = 5
BYTES_PER_FRAME = (GRID_SIZE * GRID_SIZE) - 2  # ヘッダー2マス、データ23マス
APRIL_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
FPS = 30

def generate_apriltag(tag_id, size=80, margin=10):
    valid_id = int(tag_id) % 240
    tag_img = cv2.aruco.generateImageMarker(APRIL_DICT, valid_id, size)
    tag_bgr = cv2.cvtColor(tag_img, cv2.COLOR_GRAY2BGR)
    return cv2.copyMakeBorder(tag_bgr, margin, margin, margin, margin, cv2.BORDER_CONSTANT, value=[255, 255, 255])

def main():
    with open(FILE_PATH, "rb") as f:
        file_bytes = f.read()

    total_bytes = len(file_bytes)
    total_chunks = math.ceil(total_bytes / BYTES_PER_FRAME)

    print(f"🚀 [巨大ファイル送信] データ: {total_bytes} bytes / 全 {total_chunks} コマ")
    cv2.namedWindow("AprilTag Huge Sender", cv2.WINDOW_NORMAL)

    chunk_idx = 0
    while True:
        start_idx = chunk_idx * BYTES_PER_FRAME
        chunk_data = file_bytes[start_idx : start_idx + BYTES_PER_FRAME]

        # ★ヘッダーを2マス使って最大 57,600 コマまで重複なし対応！
        h1 = (chunk_idx // 240) % 240  # 240の位
        h2 = (chunk_idx % 240)         # 1の位

        ids = [h1, h2]
        for b in chunk_data:
            ids.append(int(b) % 240)

        while len(ids) < (GRID_SIZE * GRID_SIZE):
            ids.append(0)

        rows = [np.hstack([generate_apriltag(ids[r * GRID_SIZE + c]) for c in range(GRID_SIZE)]) for r in range(GRID_SIZE)]
        combined = np.vstack(rows)

        cv2.imshow("AprilTag Huge Sender", combined)
        if cv2.waitKey(int(1000 / FPS)) & 0xFF == ord('q'):
            break

        chunk_idx = (chunk_idx + 1) % total_chunks

    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()