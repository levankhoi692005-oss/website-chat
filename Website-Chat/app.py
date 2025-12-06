import os
from flask import *
from flask_socketio import *
import mysql.connector
import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*",max_http_buffer_size= 50 * 1024 * 1024)


# ================= DATABASE =================
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="123456789",
    database="user_database",
    buffered=True
)

# ================= UPLOADS =================
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@app.route("/")
def index():
    return redirect("/home" if "username" in session else "/webchat")

@app.route("/webchat")
def webchat():
    return render_template("webchat.html")

# ---------- Signup ----------
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == 'POST':
        data = request.get_json() or {}
        username, password = data.get("username"), data.get("password")
        if not username or not password:
            return jsonify({'status': 'error', 'message': 'Thiếu dữ liệu'})

        cursor = db.cursor()
        cursor.execute("SELECT 1 FROM users WHERE username=%s", (username,))
        if cursor.fetchone():
            cursor.close()
            return jsonify({'status': 'error', 'message': 'Username đã tồn tại'})

        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        db.commit()
        cursor.close()
        return jsonify({'status': 'success'})

    return render_template("signup.html")

# ---------- Signin ----------
@app.route("/signin", methods=["GET", "POST"])
def signin():
    if request.method == 'POST':
        data = request.get_json() or {}
        username, password = data.get("username"), data.get("password")
        if not username or not password:
            return jsonify({"status": "error", "message": "Nhập thiếu dữ liệu!"})
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username=%s AND password=%s", (username, password))
        user = cursor.fetchone()
        if user:
            session["username"] = username
            session["userId"] = user["id"]
            user_id = session["userId"]
            login_time = datetime.datetime.now()
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
            cursor.execute(
                "INSERT INTO login_history (id, username, login_time, ip_address) VALUES (%s,%s, %s, %s)",
                (user_id,username, login_time, ip_address)
            )
            db.commit()
            cursor.execute("SELECT * FROM user_info WHERE username=%s", (username,))
            info = cursor.fetchone()
            cursor.close()
            return jsonify({"status": "go_home" if info else "go_info"})
        else:
            cursor.close()
            return jsonify({"status": "error", "message": "Sai tài khoản hoặc mật khẩu"})
    return render_template("signin.html")

# ---------- Home ----------
@app.route("/home")
def home():
    if "username" not in session:
        return redirect("/signin")
    username = session["username"]
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
    user_row = cursor.fetchone()
    cursor.execute("SELECT fullname FROM user_info WHERE username=%s", (username,))
    info_row = cursor.fetchone()
    cursor.close()
    user_id = user_row["id"] if user_row else "???"
    fullname = info_row["fullname"] if info_row else username
    return render_template("home.html", username=username, user_id=user_id, fullname=fullname)

@app.route("/information")
def information():
    return render_template("information.html")

# ---------- Save User Info ----------
@app.route("/save_info", methods=["POST"])
def save_info():
    if "username" not in session:
        return jsonify({"status": "error", "message": "Chưa đăng nhập!"})
    data = request.get_json() or {}
    fullname, birthday, gender = data.get("fullname"), data.get("birthday"), data.get("gender")
    username = session["username"]
    user_id = session.get("userId")
    if not fullname or not birthday or not gender:
        return jsonify({"status": "error", "message": "Thiếu dữ liệu!"})
    cursor = db.cursor()
    cursor.execute("SELECT 1 FROM user_info WHERE username=%s", (username,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"status": "already_exists"})
    cursor.execute(
        "INSERT INTO user_info (id,username, fullname, birthday, gender) VALUES (%s,%s, %s, %s, %s)",
        (user_id,username, fullname, birthday, gender)
    )
    db.commit()
    cursor.close()
    return jsonify({"status": "success"})


#------- UPLOAD FILE-----------
@app.route("/upload_file", methods=["POST"])
def upload_file():
    if "username" not in session or "userId" not in session:
        return jsonify({"status": "error", "message": "Chưa đăng nhập"}), 401
    file = request.files.get("file")
    if not file:
        return jsonify({"status": "error", "message": "Không có file"}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(UPLOAD_DIR, filename)

    if os.path.exists(save_path):
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{int(datetime.datetime.now().timestamp())}{ext}"
        save_path = os.path.join(UPLOAD_DIR, filename)
    file.save(save_path)
    file_url = f"/uploads/{filename}"

    return jsonify({"status": "success", "file_url": file_url})

# ================= MESSAGE API =================
@app.route("/get_messages")
def get_messages():
    room = request.args.get("room")
    if not room:
        return jsonify({"error": "missing room"}), 400
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            m.stt,
            m.room,
            m.sender_id,
            u.username,
            ui.fullname,
            m.text,
            m.file_url,
            m.file_name,
            m.file_type,
            m.timestamp
        FROM message m
        LEFT JOIN users u ON m.sender_id = u.id
        LEFT JOIN user_info ui ON u.username = ui.username
        WHERE m.room=%s
        ORDER BY m.timestamp ASC
    """, (room,))
    rows = cursor.fetchall()
    cursor.close()

    for r in rows:
        if isinstance(r.get("timestamp"), datetime.datetime):
            r["timestamp"] = r["timestamp"].isoformat()
    return jsonify(rows)


@app.route("/search_user", methods=["POST"])
def search_user():
    data = request.get_json() or {}
    user_id = str(data.get("id") or "").strip()
    if not user_id.isdigit():
        return jsonify({"found": False, "msg": "ID không hợp lệ"})
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT username FROM users WHERE id=%s", (user_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        return jsonify({"found": False, "msg": "Không tìm thấy"})
    _username = user["username"]
    cursor.execute("SELECT fullname FROM user_info WHERE username=%s", (_username,))
    info = cursor.fetchone()
    cursor.close()
    fullname = info["fullname"] if info else _username
    if session.get("username") == _username:
        return jsonify({"found": True, "self": True, "msg": "Đây là chính bạn!"})
    return jsonify({"found": True, "fullname": fullname, "username": _username})


@app.route('/get_joined_rooms')
def get_joined_rooms():
    user_id = request.args.get('user_id')
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM user_rooms WHERE user_id = %s", (user_id,))
    rooms = cursor.fetchall()
    res = []

    for r in rooms:
        other_user_id = r['other_user_id']
        if other_user_id is None:
            other_fullname = "Chat tổng"
        else:
            cursor.execute("""
                SELECT ui.fullname
                FROM users u
                LEFT JOIN user_info ui ON u.username = ui.username
                WHERE u.id = %s
            """, (other_user_id,))
            row = cursor.fetchone()
            other_fullname = row['fullname'] if row and row['fullname'] else str(other_user_id)

        res.append({
            'room_name': r['room_name'],
            'other_user': other_user_id,
            'other_fullname': other_fullname
        })
    cursor.close()
    return jsonify(res)

# --------create room 1-1 when search user--------
@app.route('/create_room', methods=['POST'])
def create_room():
    data = request.json
    user_id = data['user_id']
    other_user_id = data['other_user_id']
    room_name = f"room_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT username FROM users WHERE id=%s", (other_user_id,))
    user_row = cursor.fetchone()
    if user_row:
        other_username = user_row['username']
        cursor.execute("SELECT fullname FROM user_info WHERE username=%s", (other_username,))
        info = cursor.fetchone()
        other_fullname = info['fullname'] if info and info['fullname'] else other_username
    else:
        other_fullname = other_user_id

    cursor.execute(
        "INSERT IGNORE INTO user_rooms (user_id, other_user_id, room_name) VALUES (%s,%s,%s)",
        (user_id, other_user_id, room_name)
    )
    cursor.execute(
        "INSERT IGNORE INTO user_rooms (user_id, other_user_id, room_name) VALUES (%s,%s,%s)",
        (other_user_id, user_id, room_name)
    )
    db.commit()
    cursor.close()

    return jsonify({
        "status": "success",
        "room_name": room_name,
        "other_fullname": other_fullname
    })

# ---------Xóa đoạn phòng chat 1-1---
@app.route("/delete_chat", methods=["POST"])
def delete_chat():
    data = request.get_json() or {}
    room = data.get("room")
    if not room:
        return jsonify({"status": "error", "message": "missing room"}), 400

    cursor = db.cursor()
    cursor.execute("DELETE FROM message WHERE room=%s", (room,))
    cursor.execute("DELETE FROM user_rooms WHERE room_name=%s", (room,))
    db.commit()
    cursor.close()
    return jsonify({"status": "success"})


