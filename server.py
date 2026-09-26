import os

from flask import Flask, jsonify, request, send_file

from ai_tutor import talk_to_tutor

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/", methods=["GET"])
def index():
    return send_file("index.html")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/ask", methods=["POST", "OPTIONS"])
def ask():
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True) or {}
    message = data.get("message", "")

    if not message:
        return jsonify({"error": "Message is required."}), 400

    response = talk_to_tutor(message)
    return jsonify({"reply": response}), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
