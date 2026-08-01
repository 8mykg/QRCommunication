import cv2
import re

CAMERA_INDEX = 6  # カメラ番号 (GoProやWebCam)

def main():
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    detector = cv2.QRCodeDetector()

    received_chunks = {}
    total_chunks = None

    print("📥 [QRコード受信機] 起動中... (qキーで終了)")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # QRコードの検出とデコード
        decoded_info, points, _ = detector.detectAndDecode(frame)

        if decoded_info:
            # ヘッダー解析 ("コマ番号/全コマ|データ")
            match = re.match(r"^(\d+)/(\d+)\|(.*)$", decoded_info, re.DOTALL)
            if match:
                current_idx = int(match.group(1))
                total_chunks = int(match.group(2))
                payload = match.group(3)

                if current_idx not in received_chunks:
                    received_chunks[current_idx] = payload
                    print(f"⚡ コマ受信: [{len(received_chunks)}/{total_chunks}] (コマID: {current_idx})")

        # 検出したQRコードに緑枠を描画
        if points is not None:
            cv2.polylines(frame, [points.astype(int)], True, (0, 255, 0), 2)

        status_text = f"Collected: {len(received_chunks)}/{total_chunks if total_chunks else '?'}"
        cv2.putText(frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.imshow("QR Code Receiver", frame)

        # 全コマ揃ったら自動終了、またはqキーで終了
        if (total_chunks and len(received_chunks) == total_chunks) or (cv2.waitKey(1) & 0xFF == ord('q')):
            break

    cap.release()
    cv2.destroyAllWindows()

    if total_chunks and len(received_chunks) == total_chunks:
        full_text = "".join(received_chunks[i] for i in range(1, total_chunks + 1))
        print("\n🎉🎉🎉 QRコードデータ全件復元成功！ 🎉🎉🎉")
        print("--- 復元結果 ---")
        print(full_text[:100] + "...")

if __name__ == "__main__":
    main()