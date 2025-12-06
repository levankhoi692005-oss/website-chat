from flask_socketio import *
from app import socketio,db
from flask import *
import socket

# ================= SOCKET.IO =================
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

@socketio.on("connect")
def on_connect():
    username = session.get("username", "Unknown user")
    print("Client connected:", username)

@socketio.on("disconnect")
def on_disconnect():
    username = session.get("username", "Unknown user")
    print("Client disconnected:", username)

@socketio.on("join_room")
def on_join(data):
    username = data.get("username")
    room = data.get("room")
    if room:
        join_room(room)
        print(f"{username} joined {room}")

@socketio.on("leave_room")
def on_leave(data):
    username = data.get("username")
    room = data.get("room")
    if room:
        leave_room(room)
        print(f"{username} left {room}")

def get_fullname_by_user_id(user_id):
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT user_info.fullname
        FROM users
        LEFT JOIN user_info ON users.username=user_info.username
        WHERE users.id=%s
    """, (user_id,))
    row = cursor.fetchone()
    cursor.close()
    return row["fullname"] if row and row["fullname"] else "Không tên"




@socketio.on("send_message")
def handle_send_message(data):

    room = data.get("chat")
    if room in ["global", "globalchat", "global-room", "Chat tổng"]:
        room = "global_chat"
    sender_id = data.get("sender_id")
    text = data.get("text") or ""
    file_url = data.get("file_url") or ""
    file_name = data.get("file_name") or "file"
    file_type = data.get("file_type") or ""
    receiver_id = data.get("receiver_id") or None

    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO message (room, sender_id, receiver_id, text, file_url, file_name, file_type, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
    """, (room, sender_id, receiver_id, text, file_url, file_name, file_type))
    db.commit()
    cursor.close()

    fullname = get_fullname_by_user_id(sender_id)

    socketio.emit("receive_message", {
        "room": room,
        "sender_id": sender_id,
        "username": data.get("username"),
        "fullname": fullname,
        "text": text,
        "file_url": file_url,
        "file_name": file_name,
        "file_type": file_type
    }, room=room)


@socketio.on("message_received")
def on_message_received(data):
    print("message_received:", data)



