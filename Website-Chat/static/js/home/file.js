// ================= FILE UPLOAD =================
fileBtn?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/upload_file', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.status === 'success') {
            console.log("[UPLOAD SUCCESS]", data.file_url);
             pushRecent({ type: 'file', key: `${file.name}::${userId}`, ts: new Date().toISOString() });
            // Emit message chỉ khi upload thành công
            socket.emit('send_message', {
                room: currentRoom,
                chat: currentRoom,
                user: username,
                username,
                sender_id: userId,
                file_url: data.file_url,
                file_name: file.name,
                file_type: file.type,
                time: new Date().toISOString()
            });

            appendMessage({
                text: `Đã gửi file: ${file.name}`,
                file_url: data.file_url,
                file_name: file.name,
                file_type: file.type,
                username,
                timestamp: new Date().toISOString()
            }, true);
        } else {
            console.warn("[UPLOAD FAIL]", data.message);
            alert("Upload thất bại: " + data.message);
        }
    } catch (e) {
        console.error("[UPLOAD ERROR]", e);
        alert("Upload lỗi: " + e.message);
    }

    fileInput.value = '';
});

