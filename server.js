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
const snapshots = new Map(); // Map of id -> { code, name }

io.on('connection', (socket) => {
	console.log('Client connected', socket.id);
	// Send current code to the newly connected client
	socket.emit('init', { code: currentCode });
	
	// Send all existing snapshots to the new client
	const baseUrl = process.env.RAILWAY_STATIC_URL || `${socket.request.protocol}://${socket.request.get('host')}`;
	const existingSnapshots = Array.from(snapshots.entries()).map(([id, snapshot]) => ({
		id,
		name: snapshot.name,
		url: `${baseUrl}/s/${id}`
	}));
	if (existingSnapshots.length > 0) {
		socket.emit('snapshots:init', { snapshots: existingSnapshots });
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
app.post('/api/snapshot', (req, res) => {
	const id = Math.random().toString(36).slice(2, 8);
	const name = req.body.name || `Snapshot ${id}`;
	snapshots.set(id, { code: currentCode, name: name });
	const baseUrl = process.env.RAILWAY_STATIC_URL || `${req.protocol}://${req.get('host')}`;
	const url = `${baseUrl}/s/${id}`;
	
	// Broadcast the new snapshot to all connected clients
	io.emit('snapshot:created', { id, name, url });
	console.log('Snapshot created:', id, name, 'broadcasting to all clients');
	
	return res.json({ id, name, url });
});

// Fetch snapshot JSON
app.get('/api/snapshot/:id', (req, res) => {
	const { id } = req.params;
	if (!snapshots.has(id)) {
		return res.status(404).json({ error: 'Not found' });
	}
	const snapshot = snapshots.get(id);
	return res.json({ id, code: snapshot.code, name: snapshot.name });
});

// Delete snapshot
app.delete('/api/snapshot/:id', (req, res) => {
	const { id } = req.params;
	if (!snapshots.has(id)) {
		return res.status(404).json({ error: 'Not found' });
	}
	snapshots.delete(id);
	
	// Broadcast the deletion to all connected clients
	io.emit('snapshot:deleted', { id });
	console.log('Snapshot deleted:', id, 'broadcasting to all clients');
	
	return res.json({ success: true });
});

// Serve snapshot viewer page
app.get('/s/:id', (req, res) => {
  const id = req.params.id;
  const snapshot = snapshots[id];
  if (snapshot) {
    res.send(snapshot.code); // or render a page with the code
  } else {
    res.status(404).send('Snapshot not found');
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
	console.log(`Server listening on http://${HOST}:${PORT}`);
});


