require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let currentCode = '';
const snapshots = new Map();
const users = new Map(); // Store connected users and their names

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Limit number of snapshots
const MAX_SNAPSHOTS = 10; 
// Limit chat history length
const MAX_CODE_LENGTH = 50000; 

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    socket.on('user:join', (username) => {
        users.set(socket.id, username);
        // Send initial code with previous messages intact
        socket.emit('init', { 
            code: currentCode,
            username: username 
        });
        io.emit('user:joined', { username });

        // Send existing snapshots
        const formattedSnapshots = Array.from(snapshots.entries()).map(([id, snapshot]) => ({
            id,
            name: snapshot.name,
            url: `/s/${id}`
        }));
        if (formattedSnapshots.length > 0) {
            socket.emit('snapshots:init', { snapshots: formattedSnapshots });
        }
    });

    // Update the code:update event handler
    socket.on('code:update', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        const username = users.get(socket.id) || 'Anonymous';
        // Format the message with username
        const formattedMessage = `${username}: ${payload.code}\n`;
        
        // Trim chat history if too long
        if (currentCode.length > MAX_CODE_LENGTH) {
            currentCode = currentCode.slice(-MAX_CODE_LENGTH/2);
        }
        
        // Send only the new message instead of entire chat history
        socket.broadcast.emit('code:broadcast', { 
            code: formattedMessage,
            username: username,
            isNewMessage: true // Flag to indicate this is a new message
        });

        // Append new message to current code
        currentCode = currentCode + formattedMessage;
    });

    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            const leftMessage = `\n${username} left the chat\n`;
            currentCode = currentCode + leftMessage;
            io.emit('code:broadcast', { 
                code: leftMessage,
                username: 'System',
                isNewMessage: true
            });
            io.emit('user:left', { username });
            users.delete(socket.id);
        }
    });
});

// Create snapshot
app.post('/api/snapshot', (req, res) => {
    // Clear old snapshots if limit reached
    if (snapshots.size >= MAX_SNAPSHOTS) {
        const oldestId = snapshots.keys().next().value;
        snapshots.delete(oldestId);
    }

    const id = Math.random().toString(36).slice(2, 8);
    const name = req.body.name || `Snapshot ${id}`;
    const creator = req.body.username || 'Anonymous';
    snapshots.set(id, { code: currentCode, name, creator });
    
    const url = `/s/${id}`;
    io.emit('snapshot:created', { id, name, url, creator });
    return res.json({ id, name, url, creator });
});

// Get snapshot
app.get('/s/:id', (req, res) => {
    const id = req.params.id;
    const snapshot = snapshots.get(id);
    
    if (snapshot) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Snapshot: ${snapshot.name}</title>
                <meta charset="UTF-8" />
                <style>
                    body { font-family: monospace; background: #222; color: #eee; padding: 2rem; }
                    pre { background: #111; padding: 1rem; border-radius: 8px; overflow-x: auto; }
                    .meta { color: #888; font-size: 0.9em; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <h2>${snapshot.name}</h2>
                <div class="meta">Created by: ${snapshot.creator}</div>
                <pre>${escapeHtml(snapshot.code)}</pre>
            </body>
            </html>
        `);
    } else {
        res.status(404).send('Snapshot not found');
    }
});

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m];
    });
}

server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});


