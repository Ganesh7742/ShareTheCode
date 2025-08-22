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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
    socket.emit('init', { code: currentCode });

    socket.on('code:update', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        currentCode = payload.code;
        console.log('Received update from', socket.id, 'length=', currentCode.length);
        socket.broadcast.emit('code:broadcast', { code: currentCode });
    });

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected', socket.id, reason);
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});


