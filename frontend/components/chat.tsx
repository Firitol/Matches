"use client";

import { useEffect, useState } from "react";
import { createSocket } from "@/lib/socket";

export default function Chat({ roomId, userToken, receiverId }) {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    const s = createSocket(userToken);
    setSocket(s);

    s.emit("join_room", { room: roomId, page: 0 });

    s.on("chat_history", setMessages);
    s.on("receive_message", (msg) => setMessages((prev) => [...prev, msg]));
    s.on("user_typing", (uid) => {
      setTypingUser(uid);
      setTimeout(() => setTypingUser(null), 2000);
    });

    return () => s.disconnect();
  }, [roomId, userToken]);

  const sendMessage = () => {
    if (!message || !socket) return;
    socket.emit("send_message", { room: roomId, receiverId, plaintext: message });
    setMessage("");
  };

  const handleTyping = () => socket.emit("typing", roomId);

  return (
    <div>
      <div style={{ height: 300, overflowY: "auto" }}>
        {messages.map((m) => (
          <div key={m._id}>
            {m.messageType === "text" && m.plaintext}
            {m.messageType === "image" && <img src={m.fileUrl} />}
            {m.messageType === "voice" && <audio src={m.fileUrl} controls />}
            {m.read && " ✔✔"}
          </div>
        ))}
      </div>
      {typingUser && <div>Typing...</div>}
      <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleTyping} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}