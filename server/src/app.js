const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    // הגדרות CORS מאפשרות לפרונטאנד (שפועל על פורט 3000) לתקשר עם הבקאנד (פורט 5000)
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const DB_PATH = './database.sqlite'; // הנתיב לקובץ בסיס הנתונים SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');

    // יצירת טבלת 'messages' אם היא לא קיימת
    // שימו לב לגרשיים ההפוכים (backticks) סביב מחרוזת ה-SQL. זה חשוב!
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// שימוש ב-middleware של CORS
app.use(cors());
// שימוש ב-middleware של Express לניתוח גוף בקשות בפורמט JSON
app.use(express.json());

// נתיב API מסוג GET: /messages
// מחזיר את כל ההודעות הקודמות מבסיס הנתונים, ממוינות לפי זמן יצירה
app.get('/messages', (req, res) => {
    db.all('SELECT * FROM messages ORDER BY timestamp ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows); // שולח את ההודעות כמענה בפורמט JSON
    });
});

// הגדרת טיפול באירועי חיבור וניתוק של Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected'); // נדפיס לקונסול של השרת כשמשתמש מתחבר

    // מאזין לאירוע 'chat message' שנשלח מהלקוח
    socket.on('chat message', (msg) => {
        const { username, message } = msg;
        // מכניס את ההודעה החדשה לבסיס הנתונים
        db.run('INSERT INTO messages (username, message) VALUES (?, ?)', [username, message], function(err) {
            if (err) {
                console.error(err.message);
                return;
            }
            // שולח את ההודעה החדשה (כולל ה-ID שנוצר אוטומטית וזמן יצירה)
            // לכל הלקוחות המחוברים דרך Socket.IO, כדי שיתעדכנו בזמן אמת
            io.emit('chat message', { id: this.lastID, username, message, timestamp: new Date().toISOString() });
        });
    });

    // מטפל בהתנתקות של משתמש
    socket.on('disconnect', () => {
        console.log('User disconnected'); // נדפיס לקונסול של השרת כשמשתמש מתנתק
    });
});

// הגדרת פורט לשרת (ברירת מחדל 5000)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    // הודעה בקונסול השרת עם הפורט בו הוא פועל
    // שימו לב שוב לגרשיים ההפוכים (template literal) כאן
    console.log(`Server running on port ${PORT}`);
});