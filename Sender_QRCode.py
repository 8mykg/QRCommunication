import cv2
import qrcode
import numpy as np
import time

# 送信するデータ（テキストまたはバイナリ）
DATA_TEXT = "Hello Optical Stream via QR Code! Testing Sender_QRCode_.py"
DATA_BYTES = DATA_TEXT.encode("utf-8")

# 1つのQRコードに載せるバイト数と表示スピード
CHUNK_SIZE = 100  # QRコード1個あたりのデータ量
FPS = 5           # 推奨5FPS（カメラの認識率重視）

def generate_qr_code(text_data, size=400):
    """テキストデータからQRコード画像を生成"""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_L, # 軽量化のためL指定
        box_size=10,
        border=4,
    )
    qr.add_data(text_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    img_np = np.array(img)
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    return cv2.resize(img_bgr, (size, size))

def main():
    total_bytes = len(DATA_BYTES)
    total_chunks = (total_bytes + CHUNK_SIZE - 1) // CHUNK_SIZE

    print(f"📦 [QRコード送信機] データ量: {total_bytes} bytes / 全 {total_chunks} コマ")
    cv2.namedWindow("QR Code Sender", cv2.WINDOW_NORMAL)

    chunk_idx = 0
    while True:
        start_idx = chunk_idx * CHUNK_SIZE
        end_idx = min(start_idx + CHUNK_SIZE, total_bytes)
        chunk_data = DATA_BYTES[start_idx:end_idx]

        # ヘッダー情報作成: "現在のコマ/全コマ|データ"
        payload_text = chunk_data.decode("utf-8", errors="ignore")
        header = f"{chunk_idx + 1}/{total_chunks}|"
        full_payload = header + payload_text

        # QRコード画像生成
        qr_img = generate_qr_code(full_payload)

        cv2.imshow("QR Code Sender", qr_img)

        # qキーで終了
        if cv2.waitKey(int(1000 / FPS)) & 0xFF == ord('q'):
            break

        chunk_idx = (chunk_idx + 1) % total_chunks

    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()