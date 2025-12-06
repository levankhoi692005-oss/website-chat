socket.on('receive_message', data => {
    const incomingRoom = data.room || data.chat;
    const isFromMe = String(data.sender_id) === String(userId);

   if (!incomingRoom || (incomingRoom !== currentRoom && !isFromMe)) return;

    if (isFromMe && data.text && matchRecent({ type:'text', key: `${data.text}::${userId}` })) return;
    if (isFromMe && data.file_name && matchRecent({ type:'file', key: `${data.file_name}::${userId}` })) return;

    appendMessage(data, isFromMe);
    socket.emit('message_received', { user: username, sender: data.username || data.user, room: incomingRoom });
});


socket.on('connect', () => {
    console.log("socket connected", socket.id);
    joinedRooms.forEach(r => {
        socket.emit('join_room', { username, room: r });
    });
});
