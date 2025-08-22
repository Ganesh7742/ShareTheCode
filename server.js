const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let currentCode = '';

// Move these to the top, before they're used
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Fix the MongoDB connection string (URL encode the @ in password)
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://ganeshnamani01:ganesh%401409@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority';

const DB_NAME = 'sharethecode';
const COLLECTION = 'snapshots';
let db, snapshotsCollection;

// Connect to MongoDB before starting the server
MongoClient.connect(MONGO_URL, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    snapshotsCollection = db.collection(COLLECTION);
    server.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Update the socket connection code to use MongoDB instead of snapshots Map
io.on('connection', async (socket) => {
    console.log('Client connected', socket.id);
    socket.emit('init', { code: currentCode });
    
    // Get snapshots from MongoDB instead of Map
    const baseUrl = process.env.RAILWAY_STATIC_URL || `${socket.request.protocol}://${socket.request.get('host')}`;
    const existingSnapshots = await snapshotsCollection.find({}).toArray();
    const formattedSnapshots = existingSnapshots.map(snapshot => ({
        id: snapshot._id,
        name: snapshot.name,
        url: `${baseUrl}/s/${snapshot._id}`
    }));
    
    if (formattedSnapshots.length > 0) {
        socket.emit('snapshots:init', { snapshots: formattedSnapshots });
    }

	// Listen for code updates from any client
	socket.on('code:update', (payload) => {
		if (!payload || typeof payload.code !== 'string') return;
		currentCode = payload.code;
		console.log('Received update from', socket.id, 'length=', currentCode.length);
		// Broadcast to all other clients
		socket.broadcast.emit('code:broadcast', { code: currentCode });
	});

	socket.on('disconnect', (reason) => {
		console.log('Client disconnected', socket.id, reason);
	});
});

// Create a snapshot of currentCode and return a shareable URL
app.post('/api/snapshot', async (req, res) => {
  const id = Math.random().toString(36).slice(2, 8);
  const name = req.body.name || `Snapshot ${id}`;
  const snapshot = { _id: id, code: currentCode, name: name };
  await snapshotsCollection.insertOne(snapshot);
  const baseUrl = process.env.RAILWAY_STATIC_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/s/${id}`;

  io.emit('snapshot:created', { id, name, url });
  console.log('Snapshot created:', id, name, 'broadcasting to all clients');

  return res.json({ id, name, url });
});

// Fetch snapshot JSON
app.get('/api/snapshot/:id', async (req, res) => {
  const { id } = req.params;
  const snapshot = await snapshotsCollection.findOne({ _id: id });
  if (!snapshot) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json({ id, code: snapshot.code, name: snapshot.name });
});

// Delete snapshot
app.delete('/api/snapshot/:id', async (req, res) => {
  const { id } = req.params;
  const result = await snapshotsCollection.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  io.emit('snapshot:deleted', { id });
  console.log('Snapshot deleted:', id, 'broadcasting to all clients');
  return res.json({ success: true });
});

// Serve snapshot viewer page
app.get('/s/:id', async (req, res) => {
  const id = req.params.id;
  const snapshot = await snapshotsCollection.findOne({ _id: id });
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
        </style>
      </head>
      <body>
        <h2>${snapshot.name}</h2>
        <pre>${escapeHtml(snapshot.code)}</pre>
      </body>
      </html>
    `);
  } else {
    res.status(404).send('Snapshot not found');
  }
});

// Helper to escape HTML special chars
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


