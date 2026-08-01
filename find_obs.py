import cv2

print("=== カメラ番号の動作テスト ===")

# 0から3までの番号を順番に開いてみる
for index in range(10):
    print(f"\n--- カメラ番号 {index} をテスト中 ---")
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    
    if not cap.isOpened():
        print(f"カメラ {index}: 開けませんでした")
        continue

    ret, frame = cap.read()
    if ret:
        print(f"🎉 カメラ {index} の映像取得に成功！")
        cv2.imshow(f"Camera Test (Index: {index}) - 'q'キーで次へ", frame)
        print("画面が開きました。確認したら画面を選択して 'q' キーを押してください。")
        
        while True:
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        cv2.destroyAllWindows()
    else:
        print(f"カメラ {index}: 映像フレームを取得できませんでした")
        
    cap.release()

print("\nテスト完了！ほしい画面が映った番号をメモしてください。")