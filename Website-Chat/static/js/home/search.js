// ======================
//      SEARCH USER
// ======================
searchBtn?.addEventListener('click', async () => {
    const otherUserId = parseInt(searchInput.value.trim(), 10);
if (!otherUserId || isNaN(otherUserId)) return alert("ID không hợp lệ!");
if (otherUserId === userId) return alert("Đây là chính bạn!");

    try {
        const res = await fetch('/create_room', {
            method: 'POST',
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({user_id: userId, other_user_id: otherUserId})
        });
        const data = await res.json();
        const roomName = data.room_name;
        const otherFullname = data.other_fullname || otherUserId; // <-- LẤY fullname TỪ SERVER
        const chatname = otherUserId; // hoặc lấy fullname nếu có
        if (!document.querySelector(`.chat-item[data-name="${otherFullname}"]`)) {
            const li = document.createElement('li');
            li.className = 'chat-item';
            li.dataset.name = otherFullname;
            li.dataset.user = otherUserId;
            li.dataset.avatar = 'https://img.icons8.com/color/48/000000/user.png';
            li.dataset.room = roomName;
            li.innerHTML = `<div class="chat-avatar" style="background-image:url('${li.dataset.avatar}')"></div>
                            <span class="chat-title">${otherFullname}</span>
                            <button class="delete-chat-btn">🗑️</button>`;
            li.querySelector('.delete-chat-btn').addEventListener('click', e=>{
            e.stopPropagation();
            deleteChat(otherFullname); });
            li.addEventListener('click', ()=>switchChat(otherFullname, li.dataset.avatar, li.dataset.user));
            chatList.appendChild(li);
        }

        socket.emit('join_room', { username, room: roomName });
        joinedRooms.add(roomName);
        persistJoinedRooms();
        switchChat(otherFullname, 'https://img.icons8.com/color/48/000000/user.png', otherUserId);
        searchInput.value = '';
    } catch(e) {
        console.warn(e);
        alert("Tạo room thất bại!");
    }
});
