const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// הגדרת CORS לאפשר גישה מכל מקום (לצורך הדגמה)
app.use(cors({
    origin: '*', // מאפשר לכל דומיין לגשת
    methods: ['GET', 'POST'], // מתודות מותרות
    allowedHeaders: ['Content-Type'] // כותרות מותרות
}));

// הגדרת ה-CORS עבור Socket.IO
const io = socketIo(server, {
    cors: {
        origin: '*', // מאפשר לכל דומיין להתחבר ל-Socket.IO
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 5000;

// שימוש בבסיס נתונים בזיכרון - לא יישמר בין הפעלות השרת ב-Render
const DB_PATH = ':memory:'; 
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the in-memory SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (createErr) => {
            if (createErr) {
                console.error('Error creating messages table:', createErr.message);
            } else {
                console.log('Messages table created or already exists (in-memory).');
                // הוספת הודעת בדיקה אחת עם התחלת השרת (אופציונלי)
                // db.run(`INSERT INTO messages (username, message) VALUES (?, ?)`, ['System', 'Welcome to the chat!'], (insertErr) => {
                //     if (insertErr) {
                //         console.error('Error inserting initial message:', insertErr.message);
                //     }
                // });
            }
        });
    }
});

app.use(express.json());

// מסלול לקבלת הודעות היסטוריות
app.get('/messages', (req, res) => {
    db.all('SELECT * FROM messages ORDER BY timestamp ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

io.on('connection', (socket) => {
    console.log('a user connected');

    // שליחת הודעות קיימות למשתמש החדש (במקרה של זיכרון, זה יהיה ריק בהתחלה)
    db.all('SELECT * FROM messages ORDER BY timestamp ASC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching messages for new user:', err.message);
            return;
        }
        socket.emit('history', rows);
    });

    socket.on('chat message', (msg) => {
        console.log('message: ' + msg.message);
        const { username, message } = msg;

        // שמירת ההודעה בבסיס הנתונים
        db.run(`INSERT INTO messages (username, message) VALUES (?, ?)`, [username, message], function(err) {
            if (err) {
                console.error('Error inserting message:', err.message);
                return;
            }
            // שליחת ההודעה לכל הלקוחות המחוברים, כולל ה-id וה-timestamp מה-DB
            io.emit('chat message', {
                id: this.lastID, // ID שנוצר על ידי SQLite
                username,
                message,
                timestamp: new Date().toISOString() // השתמש ב-ISO string לפורמט אחיד
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});