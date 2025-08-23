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

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString(),
        connectedUsers: connectedUsers
    });
});

let currentCode = '';
let connectedUsers = 0;
let savedCodes = []; // Store saved codes for sharing

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'Total users:', connectedUsers + 1);
    connectedUsers++;
    
    // Send current code to new client
    socket.emit('init', { code: currentCode });
    
    // Send saved codes to new client
    if (savedCodes.length > 0) {
        socket.emit('savedCodes:init', { savedCodes });
    }
    
    // Broadcast updated user count to all clients
    io.emit('user:connected');

    // Handle code updates
    socket.on('code:update', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        currentCode = payload.code;
        console.log('Code updated by', socket.id, 'length:', currentCode.length);
        console.log('Broadcasting to all other clients...');
        socket.broadcast.emit('code:broadcast', { code: currentCode });
    });

    // Handle code saving/sharing
    socket.on('code:save', (payload) => {
        if (!payload || typeof payload.code !== 'string') return;
        
        const savedCode = {
            id: Date.now().toString(),
            code: payload.code,
            timestamp: new Date().toISOString(),
            title: payload.title || `Code ${savedCodes.length + 1}`
        };
        
        savedCodes.push(savedCode);
        console.log('Code saved by', socket.id, 'title:', savedCode.title);
        
        // Clear real-time sync for all users after sharing
        currentCode = '';
        console.log('Real-time sync cleared. Broadcasting clear event to all clients...');
        
        // Broadcast saved code to all clients
        io.emit('code:saved', savedCode);
        
        // Clear the real-time editor for all users with a small delay
        setTimeout(() => {
            io.emit('code:clear', { message: 'Code shared successfully! Editor cleared.' });
            console.log('Clear event sent to all clients');
        }, 100); // Small delay to ensure all pending updates are processed
    });

    // Handle code deletion
    socket.on('code:delete', (payload) => {
        if (!payload || !payload.id) return;
        
        const index = savedCodes.findIndex(code => code.id === payload.id);
        if (index !== -1) {
            const deletedCode = savedCodes.splice(index, 1)[0];
            console.log('Code deleted by', socket.id, 'title:', deletedCode.title);
            
            // Broadcast deletion to all clients
            io.emit('code:deleted', { id: payload.id });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id, 'Total users:', connectedUsers - 1);
        connectedUsers = Math.max(0, connectedUsers - 1);
        io.emit('user:disconnected');
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Real-time code sharing ready!');
    console.log('Other computers can access: http://[YOUR_IP_ADDRESS]:3000');
    console.log('To find your IP address, run: ipconfig (Windows) or ifconfig (Mac/Linux)');
});



