import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css'; // ניצור קובץ CSS בהמשך

const socket = io('http://localhost:5000'); // כתובת שרת הבקאנד

function App() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('Anonymous'); // שם משתמש ברירת מחדל

    useEffect(() => {
        // טעינת הודעות קודמות מהשרת
        axios.get('http://localhost:5000/messages')
            .then(response => {
                setMessages(response.data);
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
            });

        // האזנה להודעות חדשות מהשרת דרך Socket.IO
        socket.on('chat message', (msg) => {
            setMessages((prevMessages) => [...prevMessages, msg]);
        });

        // ניקוי בעת התנתקות
        return () => {
            socket.off('chat message');
        };
    }, []);

    const sendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            socket.emit('chat message', { username, message: newMessage });
            setNewMessage('');
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-sidebar">
                <h3>משתמשים (דוגמה)</h3>
                <ul>
                    <li>{username}</li>
                    {/* כאן אפשר להוסיף רשימת משתמשים מחוברים בעתיד */}
                </ul>
            </div>
            <div className="chat-main">
                <h1>צ'אט פשוט</h1>
                <div className="messages-list">
                    {messages.map((msg) => (
                        <div key={msg.id} className="message-item">
                            <strong>{msg.username}:</strong> {msg.message}
                            <span className="message-timestamp">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    ))}
                </div>
                <form onSubmit={sendMessage} className="message-form">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="שם משתמש"
                        className="username-input"
                    />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="הקלד הודעה..."
                        className="message-input"
                    />
                    <button type="submit" className="send-button">שלח</button>
                </form>
            </div>
        </div>
    );
}

export default App;
