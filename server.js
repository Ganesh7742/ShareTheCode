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
const users = new Map();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_CODE_LENGTH = 50000;

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    socket.on('user:join', (username) => {
        users.set(socket.id, username);
        socket.emit('init', { code: currentCode });
        io.emit('user:joined', { username });

        // Send existing snapshots
        const formattedSnapshots = Array.from(snapshots.entries()).map(([id, snapshot]) => ({
            id,
            name: snapshot.name,
            url: `/s/${id}`,
            creator: snapshot.creator,
            timestamp: snapshot.timestamp
        }));
        
        if (formattedSnapshots.length > 0) {
            socket.emit('snapshots:init', { snapshots: formattedSnapshots });
        }
    });

    socket.on('code:update', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        const username = users.get(socket.id) || 'Anonymous';
        const message = payload.code.trim();
        
        if (message) {
            const formattedMessage = `${username}: ${message}\n`;
            
            // Trim chat history if too long
            if (currentCode.length > MAX_CODE_LENGTH) {
                currentCode = currentCode.slice(-MAX_CODE_LENGTH/2);
            }
            
            // Update current code
            currentCode += formattedMessage;
            
            // Broadcast only the new message
            socket.broadcast.emit('code:broadcast', {
                code: formattedMessage,
                username: username,
                isNewMessage: true
            });
        }
    });

    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            const leftMessage = `\n${username} left the chat\n`;
            currentCode += leftMessage;
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
    const id = Math.random().toString(36).slice(2, 8);
    const name = req.body.name || `Chat ${new Date().toLocaleString()}`;
    const creator = req.body.username || 'Anonymous';
    
    snapshots.set(id, {
        code: currentCode,
        name,
        creator,
        timestamp: new Date().toISOString()
    });
    
    const url = `/s/${id}`;
    const snapshotData = { id, name, url, creator };
    
    io.emit('snapshot:created', snapshotData);
    console.log('Chat snapshot saved:', id, name, url);
    
    return res.json(snapshotData);
});

// View snapshot
app.get('/s/:id', (req, res) => {
    const id = req.params.id;
    const snapshot = snapshots.get(id);
    
    if (snapshot) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chat: ${snapshot.name}</title>
                <meta charset="UTF-8" />
                <style>
                    body { 
                        font-family: monospace; 
                        background: #222; 
                        color: #eee; 
                        padding: 2rem;
                        line-height: 1.6;
                    }
                    .chat { 
                        background: #111; 
                        padding: 1rem; 
                        border-radius: 8px; 
                        white-space: pre-wrap;
                    }
                    .meta { 
                        color: #888; 
                        font-size: 0.9em; 
                        margin-bottom: 1rem; 
                    }
                </style>
            </head>
            <body>
                <h2>${snapshot.name}</h2>
                <div class="meta">
                    Saved by: ${snapshot.creator}<br>
                    Time: ${new Date(snapshot.timestamp).toLocaleString()}
                </div>
                <div class="chat">${escapeHtml(snapshot.code)}</div>
            </body>
            </html>
        `);
    } else {
        res.status(404).send('Chat snapshot not found');
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


