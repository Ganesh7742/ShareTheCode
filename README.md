# Real-Time Code Sharing

A simple, clean real-time code sharing website where multiple users can collaborate on code simultaneously.

## Features

- **Real-time synchronization**: Code changes are instantly shared with all connected users
- **Simple interface**: Clean, modern UI focused on code editing
- **No registration required**: Just open the website and start coding
- **Live connection status**: See when you're connected and how many others are online
- **Responsive design**: Works on desktop and mobile devices

## How it works

1. Open the website in your browser
2. Start typing code in the editor
3. Your code automatically syncs with everyone else in real-time
4. See live updates as others type
5. No accounts, no names, no complexity - just pure code collaboration

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ShareTheCode
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

### Development

To run in development mode:
```bash
npm run dev
```

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time Communication**: WebSocket via Socket.IO

## Usage

- Simply start typing in the code editor
- All changes are automatically synchronized with other users
- The connection status indicator shows when you're connected
- The user count shows how many people are currently online

## Deployment

The application is ready for deployment on platforms like:
- Heroku
- Railway
- Vercel
- Any Node.js hosting service

Set the `PORT` environment variable if needed.

## License

ISC
