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
let connectedUsers = new Map(); // Store users with their usernames
let savedCodes = []; // Store saved codes for sharing
let chatMessages = []; // Store chat messages

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle user joining with username
    socket.on('user:join', (payload) => {
        if (!payload || !payload.username) return;
        
        const username = payload.username.trim();
        if (!username) return;
        
        // Store user info
        connectedUsers.set(socket.id, {
            id: socket.id,
            username: username,
            joinedAt: new Date().toISOString()
        });
        
        console.log('User joined:', username, 'ID:', socket.id);
        
        // Send current code to new client
        socket.emit('init', { code: currentCode });
        
        // Send saved codes to new client
        if (savedCodes.length > 0) {
            socket.emit('savedCodes:init', { savedCodes });
        }
        
        // Send recent chat messages to new client
        if (chatMessages.length > 0) {
            socket.emit('chat:history', { messages: chatMessages.slice(-50) }); // Send last 50 messages
        }
        
        // Broadcast user list to all clients
        const userList = Array.from(connectedUsers.values());
        io.emit('users:update', { users: userList });
        
        // Broadcast join message to all clients
        const joinMessage = {
            id: Date.now().toString(),
            type: 'system',
            message: `${username} joined the session`,
            timestamp: new Date().toISOString()
        };
        
        chatMessages.push(joinMessage);
        io.emit('chat:message', joinMessage);
    });

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
    
    // Handle chat messages
    socket.on('chat:send', (payload) => {
        if (!payload || !payload.message) return;
        
        const user = connectedUsers.get(socket.id);
        if (!user) return; // User must be logged in to send messages
        
        const message = payload.message.trim();
        if (!message) return;
        
        const chatMessage = {
            id: Date.now().toString(),
            type: 'user',
            username: user.username,
            userId: socket.id, // Add userId for deletion permission check
            message: message,
            timestamp: new Date().toISOString()
        };
        
        chatMessages.push(chatMessage);
        
        // Keep only last 100 messages to prevent memory issues
        if (chatMessages.length > 100) {
            chatMessages = chatMessages.slice(-100);
        }
        
        console.log('Chat message from', user.username + ':', message);
        
        // Broadcast message to all clients
        io.emit('chat:message', chatMessage);
    });
    
    // Handle chat message deletion
    socket.on('chat:delete', (payload) => {
        if (!payload || !payload.messageId) return;
        
        const user = connectedUsers.get(socket.id);
        if (!user) return; // User must be logged in to delete messages
        
        // Find the message to delete
        const messageIndex = chatMessages.findIndex(msg => 
            msg.id === payload.messageId && msg.userId === socket.id
        );
        
        if (messageIndex !== -1) {
            const deletedMessage = chatMessages[messageIndex];
            chatMessages.splice(messageIndex, 1);
            
            console.log('Message deleted by', user.username, 'message ID:', payload.messageId);
            
            // Broadcast message deletion to all clients
            io.emit('chat:messageDeleted', { 
                messageId: payload.messageId,
                deletedBy: user.username 
            });
        } else {
            // Message not found or user doesn't have permission
            socket.emit('chat:deleteError', { 
                error: 'Message not found or you do not have permission to delete this message' 
            });
        }
    });

    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            console.log('User disconnected:', user.username, 'ID:', socket.id);
            
            // Remove user from connected users
            connectedUsers.delete(socket.id);
            
            // Broadcast leave message to all clients
            const leaveMessage = {
                id: Date.now().toString(),
                type: 'system',
                message: `${user.username} left the session`,
                timestamp: new Date().toISOString()
            };
            
            chatMessages.push(leaveMessage);
            io.emit('chat:message', leaveMessage);
            
            // Broadcast updated user list to all clients
            const userList = Array.from(connectedUsers.values());
            io.emit('users:update', { users: userList });
        } else {
            console.log('Client disconnected:', socket.id);
        }
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Real-time code sharing ready!');
    console.log('Other computers can access: http://[YOUR_IP_ADDRESS]:3000');
    console.log('To find your IP address, run: ipconfig (Windows) or ifconfig (Mac/Linux)');
});



