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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
    socket.emit('init', { code: currentCode });

    // Send existing snapshots
    const formattedSnapshots = Array.from(snapshots.entries()).map(([id, snapshot]) => ({
        id,
        name: snapshot.name,
        url: `/s/${id}`,
        timestamp: snapshot.timestamp
    }));
    
    if (formattedSnapshots.length > 0) {
        socket.emit('snapshots:init', { snapshots: formattedSnapshots });
    }

    socket.on('code:update', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        currentCode = payload.code;
        socket.broadcast.emit('code:broadcast', { code: currentCode });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});

// Create snapshot
app.post('/api/snapshot', (req, res) => {
    const id = Math.random().toString(36).slice(2, 8);
    const name = req.body.name || `Snapshot ${new Date().toLocaleString()}`;
    
    snapshots.set(id, {
        code: currentCode,
        name,
        timestamp: new Date().toISOString()
    });
    
    const snapshotData = {
        id,
        name,
        url: `/s/${id}`,
        timestamp: new Date().toISOString()
    };
    
    io.emit('snapshot:created', snapshotData);
    console.log('Snapshot saved:', id, name);
    
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
                <title>Snapshot: ${snapshot.name}</title>
                <meta charset="UTF-8" />
                <style>
                    body { 
                        font-family: monospace; 
                        background: #222; 
                        color: #eee; 
                        padding: 2rem;
                        line-height: 1.6;
                    }
                    .content { 
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
                    Time: ${new Date(snapshot.timestamp).toLocaleString()}
                </div>
                <div class="content">${escapeHtml(snapshot.code)}</div>
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


