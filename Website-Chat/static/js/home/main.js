
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const chatHeaderName = document.getElementById('chatHeaderName');
const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
const chatList = document.getElementById('chatList');
const logoutBtn = document.getElementById('logoutBtn');
const userId = parseInt(document.querySelector('#userId')?.value || CURRENT_USER_ID, 10);
const username = CURRENT_FULLNAME;

if (isNaN(userId)) {
    console.error("userId không hợp lệ!", document.querySelector('#userId')?.value, CURRENT_USER_ID);
}


//      ROOMS & SOCKET

let currentChat = "Chat tổng";
let currentRoom = "global_chat";

const socket = io("/");

socket.on("server_ip", (ip) => {
    console.log("Server LAN IP:", ip);

    window.socket = io(`http://${ip}:5000`, {
        transports: ["websocket"]
    });
});


//const socket = io("/", { transports: ["websocket", "polling"] });
//const socket = io("https://unparcelling-subserviently-lucia.ngrok-free.dev", {
//  transports: ["websocket", "polling"]});


const joinedRooms = new Set(JSON.parse(localStorage.getItem('joinedRooms') || "[]"));
if (!joinedRooms.has("global_chat")) joinedRooms.add("global_chat");
localStorage.setItem('joinedRooms', JSON.stringify(Array.from(joinedRooms)));

