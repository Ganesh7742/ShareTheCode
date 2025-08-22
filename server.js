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

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    // Handle user joining with name
    socket.on('user:join', (username) => {
        users.set(socket.id, username);
        socket.emit('init', { code: currentCode });
        io.emit('user:joined', { id: socket.id, username });
        console.log(`User ${username} joined (${socket.id})`);

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

    socket.on('code:update', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        currentCode = payload.code;
        const username = users.get(socket.id) || 'Anonymous';
        console.log(`Received update from ${username} (${socket.id}), length=${currentCode.length}`);
        socket.broadcast.emit('code:broadcast', { 
            code: currentCode,
            username: username
        });
    });

    socket.on('disconnect', (reason) => {
        const username = users.get(socket.id) || 'Anonymous';
        console.log(`User ${username} disconnected (${socket.id}): ${reason}`);
        io.emit('user:left', { id: socket.id, username });
        users.delete(socket.id);
    });
});

// Update snapshot creation to include creator's name
app.post('/api/snapshot', (req, res) => {
    const id = Math.random().toString(36).slice(2, 8);
    const name = req.body.name || `Snapshot ${id}`;
    const creator = req.body.username || 'Anonymous';
    snapshots.set(id, { code: currentCode, name, creator });
    
    const shortUrl = `/s/${id}`;
    io.emit('snapshot:created', { id, name, url: shortUrl, creator });
    console.log('Snapshot created by', creator, ':', id, name, shortUrl);

    return res.json({ id, name, url: shortUrl, creator });
});

app.get('/api/snapshot/:id', (req, res) => {
    const { id } = req.params;
    const snapshot = snapshots.get(id);
    if (!snapshot) {
        return res.status(404).json({ error: 'Not found' });
    }
    return res.json({ id, code: snapshot.code, name: snapshot.name });
});

app.delete('/api/snapshot/:id', (req, res) => {
    const { id } = req.params;
    if (!snapshots.has(id)) {
        return res.status(404).json({ error: 'Not found' });
    }
    snapshots.delete(id);
    io.emit('snapshot:deleted', { id });
    console.log('Snapshot deleted:', id);
    return res.json({ success: true });
});

// Update snapshot viewer to show creator
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

// Helper function for HTML escaping
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

// Start server
server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});


