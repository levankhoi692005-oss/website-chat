function clearMessages() { chatMessages.innerHTML = ''; }

function appendMessage(msgData, self=false) {
    const msg = document.createElement('div');
    msg.className = 'message ' + (self ? 'self' : 'other');

    const sender = document.createElement('div');
    sender.className = 'sender';
    sender.textContent = self ? "Bạn" : (msgData.fullname || msgData.username || msgData.user || "Không tên");
    msg.appendChild(sender);
    const file_url = msgData.file_url || null;
    const fileType = msgData.file_type || '';
    const file_name = msgData.file_name || 'file';
    if (file_url) {
    if ((fileType || '').startsWith('image/')) {
        const img = document.createElement('img');
        img.src = file_url; // URL thật từ server
        img.style.maxWidth = '280px';
        img.style.maxHeight = '300px';
        img.alt = file_name;
        msg.appendChild(img);
    } else {
        const a = document.createElement('a');
        a.href = file_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = file_name;
        msg.appendChild(a);
    }
} else if (msgData.text) {
        const textNode = document.createElement('div');
        textNode.className = 'text';
        textNode.textContent = msgData.text;
        msg.appendChild(textNode);
    }

    const timeNode = document.createElement('div');
    timeNode.className = 'time';
    timeNode.textContent = msgData.timestamp ? formatTime(msgData.timestamp) : '';
    msg.appendChild(timeNode);

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ====== Emoji ======
const emojiPicker = document.createElement('div');
emojiPicker.id = 'emojiPicker';

const emojis = ['😀','😂','😍','😎','😭','😡','👍','❤️','🎉','💡'];
emojis.forEach(e => {
    const span = document.createElement('span');
    span.textContent = e;
    emojiPicker.appendChild(span);
});
emojiPicker.style.display = 'none';

const container = document.querySelector('.chat-input');
if (container) container.appendChild(emojiPicker);

emojiBtn.addEventListener('click', () => {
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
});

emojiPicker.addEventListener('click', e => {
    if (e.target.tagName === 'SPAN') {
        messageInput.value += e.target.textContent;
        messageInput.focus();
    }
});

//      DEDUPLICATION

const recentSent = [];
function pushRecent(item) {
    recentSent.push(item);
    const cutoff = Date.now() - 15000;
    while (recentSent.length > 50 || (recentSent[0] && new Date(recentSent[0].ts).getTime() < cutoff)) recentSent.shift();
}
function matchRecent(item) {
    for (let i = 0; i < recentSent.length; i++) {
        const r = recentSent[i];
        if (r.type === item.type && r.key === item.key) {
            recentSent.splice(i, 1);
            return true;
        }
    }
    return false;
}

//      LOAD MESSAGES

async function loadMessages(room, headerName=null) {
    clearMessages();
    chatHeaderName.textContent = headerName || room;
    try {
        const res = await fetch(`/get_messages?room=${encodeURIComponent(room)}`);
        const messages = await res.json();
        messages.forEach(m => appendMessage(m, String(m.sender_id) === String(userId)));
    } catch (e) {
        console.warn("loadMessages error:", e);
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.textContent = `Không thể tải lịch sử: ${e.message}`;
        chatMessages.appendChild(msg);
    }
}

//      SWITCH CHAT

async function switchChat(chatName, avatar, otherUser = null) {
    if (currentRoom) {
        socket.emit("leave_room", { username, room: currentRoom });
    }
    currentRoom = chatName === "Chat tổng"
    ? "global_chat"
    : canonicalRoom(userId, otherUser);
    chatHeaderName.textContent = chatName;
    if (chatHeaderAvatar) chatHeaderAvatar.style.backgroundImage = `url('${avatar}')`;
    socket.emit("join_room", { username, room: currentRoom });
    joinedRooms.add(currentRoom);
    persistJoinedRooms();
    await loadMessages(currentRoom, chatName);
}

//      SEND MESSAGE

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const payload = { room: currentRoom, chat: currentRoom,
     user: username, username, sender_id: userId, text, time: now };

    appendMessage({ text, username, timestamp: now }, true);
    pushRecent({ type: 'text', key: `${text}::${userId}`, ts: now });
    socket.emit('send_message', payload);
    messageInput.value = '';
}
//      DELETE CHAT

async function deleteChat(chatName) {
    if (!confirm(`Xóa cuộc trò chuyện với "${chatName}"?`)) return;
    const li = document.querySelector(`.chat-item[data-name="${chatName}"]`);
    if (!li) return alert("Không tìm thấy cuộc trò chuyện");
    let roomToDelete = li.dataset.room || (chatName === "Chat tổng" ? "global_chat" : null);
    if (!roomToDelete) return alert("Không xác định được phòng chat");
    try {
        const res = await fetch("/delete_chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: roomToDelete })
        });
        const data = await res.json();
        if (data.status === "success") {
            if (roomToDelete === currentRoom) clearMessages();
            li.remove();
            socket.emit('leave_room', { username, room: roomToDelete });
            joinedRooms.delete(roomToDelete);
            persistJoinedRooms();
            alert("Đã xoá cuộc trò chuyện!");
        } else alert("Xoá thất bại");
    } catch (e) { console.warn(e); alert("Lỗi khi xóa"); }
}

sendBtn?.addEventListener('click', sendMessage);
messageInput?.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }});

window.addEventListener('load', async () => {
    let chatTong = document.querySelector('.chat-item[data-name="Chat tổng"]');
    if (chatTong) {
    chatTong.addEventListener('click', () => switchChat('Chat tổng', chatTong.dataset.avatar)); }
    else {
    chatTong = document.createElement('li');
    chatTong.className = 'chat-item active';
    chatTong.dataset.name = 'Chat tổng';
    chatTong.dataset.user = 'global_chat';
    chatTong.dataset.avatar = 'https://img.icons8.com/color/48/000000/group-chat.png';
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'chat-avatar';
    avatarDiv.style.backgroundImage = url('${chatTong.dataset.avatar}');
    const titleSpan = document.createElement('span');
    titleSpan.className = 'chat-title';
    titleSpan.textContent = 'Chat tổng';
    chatTong.appendChild(avatarDiv);
    chatTong.appendChild(titleSpan);
    chatTong.addEventListener('click', () => switchChat('Chat tổng', chatTong.dataset.avatar));
    chatList.prepend(chatTong); }
    socket.emit('join_room', { username, room: 'global_chat' });

    try {
        const res = await fetch(`/get_joined_rooms?user_id=${userId}`);
        const rooms = await res.json();
        rooms.forEach(r => {
            const chatname = r.other_fullname || r.other_user;
            if (chatname === "Chat tổng") return;
            const roomName = r.room_name;
            if (!document.querySelector(`.chat-item[data-name="${chatname}"]`)) {
                const li = document.createElement('li');
                li.className = 'chat-item';
                li.dataset.name = chatname;
                li.dataset.user = r.other_user;
                li.dataset.avatar = 'https://img.icons8.com/color/48/000000/user.png';
                li.dataset.room = roomName;
                li.innerHTML = `<div class="chat-avatar" style="background-image:url('${li.dataset.avatar}')"></div>
                                <span class="chat-title">${chatname}</span>
                                <button class="delete-chat-btn">🗑️</button>`;
                li.querySelector('.delete-chat-btn').addEventListener('click', e => { e.stopPropagation(); deleteChat(chatname); });
                li.addEventListener('click', () => switchChat(chatname, li.dataset.avatar, li.dataset.user));
                chatList.appendChild(li);
            }
            if (!joinedRooms.has(roomName)) {
                socket.emit('join_room', { username, room: roomName });
                joinedRooms.add(roomName);
            }
        });
        persistJoinedRooms();
    } catch (e) {
        console.warn("Không load chat 1-1:", e);
    }
    await switchChat('Chat tổng', chatTong.dataset.avatar);
});


