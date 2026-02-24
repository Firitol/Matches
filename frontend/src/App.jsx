// frontend/src/App.jsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { autoConnect: false });

export default function App() {
  const [user, setUser] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Login & connect socket
  const handleLogin = async () => {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "user1", password: "1234" })
    });
    const data = await res.json();
    if (data.token) {
      setUser({ id: data.userId, token: data.token });
      socket.auth = { token: data.token };
      socket.connect();
    }
  };

  useEffect(() => {
    if (!user) return;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("receive_message", msg => setChat(prev => [...prev, msg]));
    socket.on("user_online", users => setOnlineUsers(users));
    socket.on("user_offline", users => setOnlineUsers(users));
    socket.on("user_typing", u => {
      setTypingUsers(prev => [...new Set([...prev, u])]);
      setTimeout(() => setTypingUsers(prev => prev.filter(x => x !== u)), 3000);
    });
    socket.on("message_read", msgId => {
      setChat(prev => prev.map(m => m._id === msgId ? { ...m, read: true } : m));
    });

    socket.on("connect_error", err => console.log("Socket error:", err.message));

    return () => socket.disconnect();
  }, [user]);

  const handleTyping = () => socket.emit("typing");

  const sendMessage = () => {
    if (!message) return;
    socket.emit("send_message", { message });
    setChat(prev => [...prev, { senderId: user.id, message, read: false }]);
    setMessage("");
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>EthioMatch Chat</h1>
      <div>Socket: {socketConnected ? "Connected ✅" : "❌ Not connected"}</div>

      {!user && <button onClick={handleLogin}>Login</button>}

      {user && (
        <>
          <div>Online users: {onlineUsers.join(", ")}</div>
          <div style={{ height: 200, overflowY: "auto", border: "1px solid #ccc", margin: "10px 0", padding: 5 }}>
            {chat.map((m, i) => (
              <div key={i}>
                <b>{m.senderId}:</b> {m.message} {m.read ? "✔️" : "❌"}
              </div>
            ))}
          </div>
          <div style={{ color: "blue" }}>
            {typingUsers.length > 0 && `${typingUsers.join(", ")} is typing...`}
          </div>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={handleTyping}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </>
      )}
    </div>
  );
}