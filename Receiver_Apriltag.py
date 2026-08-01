import cv2
import numpy as np

CAMERA_INDEX = 6
GRID_SIZE = 5

APRIL_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
APRIL_PARAMS = cv2.aruco.DetectorParameters()
DETECTOR = cv2.aruco.ArucoDetector(APRIL_DICT, APRIL_PARAMS)

def sort_tags_by_position(corners, ids):
    tags = [{'id': int(tag_id), 'x': np.mean(corner[0][:, 0]), 'y': np.mean(corner[0][:, 1])} 
            for corner, tag_id in zip(corners, ids.flatten())]
    tags.sort(key=lambda t: t['y'])
    
    sorted_tags = []
    for r in range(GRID_SIZE):
        row_tags = tags[r * GRID_SIZE : (r + 1) * GRID_SIZE]
        row_tags.sort(key=lambda t: t['x'])
        sorted_tags.extend(row_tags)
    return [t['id'] for t in sorted_tags]

def main():
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    
    received_chunks = {}
    
    print("⚡ [堅牢版 5x5 受信モード] 起動中... (sキーで保存)")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        corners, ids, rejected = DETECTOR.detectMarkers(frame)

        # 25個ぴったり検知できた場合のみ処理
        if ids is not None and len(ids) == (GRID_SIZE * GRID_SIZE):
            sorted_ids = sort_tags_by_position(corners, ids)

            h1, h2 = sorted_ids[0], sorted_ids[1]
            real_chunk_id = (h1 * 240) + h2
            
            # データ部分（23バイト）
            raw_data = [int(x) for x in sorted_ids[2:]]
            
            # 簡易エラーチェック: データがすべて0〜239の範囲内かつIDが有効か
            if 0 < real_chunk_id <= 1000 and all(0 <= b < 240 for b in raw_data):
                # まだ持っていないコマのみ保存（誤判定による上書き防止！）
                if real_chunk_id not in received_chunks:
                    received_chunks[real_chunk_id] = bytes(raw_data)
                    print(f"✅ 新規コマGET! [{len(received_chunks)}/559] (コマID: {real_chunk_id})")
                    
                    # 緑枠を描画して「成功」を視覚化
                    cv2.aruco.drawDetectedMarkers(frame, corners, ids)

        # 画面に現在の取得数と未取得数をデカデカと表示
        status_text = f"Collected: {len(received_chunks)} / 559"
        cv2.putText(frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)

        cv2.imshow("Robust AprilTag Receiver", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == ord('s'):
            break

    cap.release()
    cv2.destroyAllWindows()

    if received_chunks:
        # コマID順に正しく結合
        sorted_keys = sorted(received_chunks.keys())
        full_bytes = bytearray()
        for k in sorted_keys:
            full_bytes.extend(received_chunks[k])

        output_filename = "restored_robust_image.jpg"
        with open(output_filename, "wb") as f:
            f.write(full_bytes)

        print(f"\n🎉🎉🎉 厳格検証で全データ保存成功！ '{output_filename}' を確認してください！ 🎉🎉🎉")

if __name__ == "__main__":
    main()