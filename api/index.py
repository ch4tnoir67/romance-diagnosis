import os
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def process_palm_image(image):
    h, w, c = image.shape
    roi_size = min(w, h) // 2
    x = w // 2 - roi_size // 2
    y = h // 2 - roi_size // 2
    bw, bh = roi_size, roi_size
    palm_roi = image[y:y+bh, x:x+bw]
    
    if palm_roi.size == 0:
        return {"error": "画像の処理に失敗しました。"}

    gray = cv2.cvtColor(palm_roi, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, threshold1=30, threshold2=100)
    
    edge_density = np.sum(edges > 0) / (bw * bh)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=30, minLineLength=20, maxLineGap=5)
    
    long_lines_count = 0
    if lines is not None:
        long_lines_count = len(lines)

    palm_type = "standard"
    if edge_density > 0.12:
        palm_type = "complex"
    elif long_lines_count > 10:
        palm_type = "strong"
    elif edge_density < 0.05:
        palm_type = "simple"

    return {
        "success": True,
        "palm_type": palm_type,
        "edge_density": float(edge_density),
        "long_lines_count": int(long_lines_count)
    }

@app.route('/api/analyze-palm', methods=['POST'])
def analyze_palm():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({"success": False, "error": "画像データがありません"}), 400

        image_data = data['image']
        header, encoded = image_data.split(",", 1)
        decoded = base64.b64decode(encoded)
        
        np_arr = np.frombuffer(decoded, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"success": False, "error": "画像の読み込みに失敗しました"}), 400

        result = process_palm_image(img)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Vercel requirements
def handler(request):
    return app(request)

if __name__ == '__main__':
    app.run(port=5000)
