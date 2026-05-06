import os
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the browser

def process_palm_image(image):
    """
    画像を解析し、手相のシワ（線）の特徴を抽出する
    """
    h, w, c = image.shape
    
    # 画像の中央部分を「手のひら領域（ROI）」として切り抜く
    # （カメラの中央に手をかざすことを想定）
    roi_size = min(w, h) // 2
    x = w // 2 - roi_size // 2
    y = h // 2 - roi_size // 2
    bw, bh = roi_size, roi_size

    palm_roi = image[y:y+bh, x:x+bw]
    
    if palm_roi.size == 0:
        return {"error": "画像の処理に失敗しました。"}

    # --- 画像処理（エッジ検出）による線の解析 ---
    gray = cv2.cvtColor(palm_roi, cv2.COLOR_BGR2GRAY)
    
    # コントラスト強調 (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # ノイズ除去
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Cannyエッジ検出でシワを抽出
    edges = cv2.Canny(blur, threshold1=30, threshold2=100)
    
    # 線の密度（シワの多さ）を計算
    edge_density = np.sum(edges > 0) / (bw * bh)
    
    # 線の長さや太さの傾向を分析 (Hough Transform)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=30, minLineLength=20, maxLineGap=5)
    
    long_lines_count = 0
    if lines is not None:
        long_lines_count = len(lines)

    # 特徴量から手相のタイプを分類（占い風の解釈）
    palm_type = "standard"
    if edge_density > 0.12:
        palm_type = "complex"  # シワが多く、繊細・感受性豊か
    elif long_lines_count > 10:
        palm_type = "strong"   # はっきりとした長い線が多い・情熱的
    elif edge_density < 0.05:
        palm_type = "simple"   # 線が少なくシンプル・合理的でサッパリ

    return {
        "success": True,
        "palm_type": palm_type,
        "edge_density": float(edge_density),
        "long_lines_count": int(long_lines_count)
    }

@app.route('/analyze-palm', methods=['POST'])
def analyze_palm():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({"success": False, "error": "画像データがありません"}), 400

        # Base64データをデコード
        image_data = data['image']
        header, encoded = image_data.split(",", 1)
        decoded = base64.b64decode(encoded)
        
        # NumPy配列に変換してOpenCVで読み込み
        np_arr = np.frombuffer(decoded, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"success": False, "error": "画像の読み込みに失敗しました"}), 400

        # 手相解析処理
        result = process_palm_image(img)
        return jsonify(result)

    except Exception as e:
        print("Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # サーバー起動
    print("手のひら解析サーバーを起動します (http://localhost:5000)...")
    app.run(port=5000, debug=True)
