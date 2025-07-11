﻿import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css'; // חשוב לוודא שזה מצביע לקובץ CSS הנכון

function App() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef(null);

  // הגדרת URL של הבקאנד באופן דינמי
  // אם משתנה הסביבה REACT_APP_BACKEND_URL קיים (ב-Render), נשתמש בו.
  // אחרת (בפיתוח מקומי), נחזור ל-localhost:5000.
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // יצירת חיבור Socket.IO
  const socket = io(backendUrl);

  useEffect(() => {
    // טעינת היסטוריית הודעות מהשרת REST API
    axios.get(`${backendUrl}/messages`)
      .then(response => {
        setMessages(response.data);
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
      });

    // האזנה להודעות חדשות מ-Socket.IO
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // האזנה להיסטוריית הודעות שהשרת שולח בהתחברות (בנוסף ל-REST API)
    socket.on('history', (historyMessages) => {
      // אם אנחנו רוצים לאחד את ההיסטוריה מה-DB המרוחק עם זו שב-Socket.IO
      // עבור הדמו הזה, נסתמך בעיקר על ה-REST API לטעינה ראשונית.
      // אם השרת In-Memory, ה-history הזה יהיה ריק בכל מקרה.
      // setMessages((prevMessages) => [...prevMessages, ...historyMessages]);
    });

    // ניקוי כאשר הקומפוננטה נטענת מחדש או נעלמת
    return () => {
      socket.off('chat message');
      socket.off('history');
      socket.disconnect(); // ניתוק מהסוקט כאשר הקומפוננטה עוזבת
    };
  }, [backendUrl]); // הוספת backendUrl כתלות כדי שהאפקט יופעל מחדש אם ה-URL משתנה (לא צפוי, אבל מומלץ)


  // גלילה אוטומטית לתחתית הצ'אט
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && username.trim()) {
      const messageData = {
        username: username,
        message: messageInput.trim(),
      };
      socket.emit('chat message', messageData);
      setMessageInput('');
    } else {
      alert('Please enter your username and a message.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-time Chat</h1>
      </header>
      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.username === username ? 'my-message' : ''}`}>
              <span className="username">{msg.username}:</span> {msg.message}
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="username-input"
            required
          />
          <input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="message-input"
            required
          />
          <button type="submit" className="send-button">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;