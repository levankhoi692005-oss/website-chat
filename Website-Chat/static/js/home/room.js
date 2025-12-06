function canonicalRoom(id1, id2) {
    const n1 = Number(id1);
    const n2 = Number(id2);
    if (isNaN(n1) || isNaN(n2)) {
        console.error("canonicalRoom nhận ID không hợp lệ:", id1, id2);
        return `room_invalid`;
    }
    if (n1 === n2) return `room_${n1}`;
    const pair = [n1, n2].sort((a,b)=>a-b);
    return `room_${pair[0]}_${pair[1]}`;
}


function formatTime(iso) {
    try { return new Date(iso).toLocaleString(); }
    catch { return iso || ""; }
}

function persistJoinedRooms() {
    localStorage.setItem('joinedRooms', JSON.stringify(Array.from(joinedRooms)));
}