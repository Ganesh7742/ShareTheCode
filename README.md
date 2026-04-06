# Real-Time File Sharing

A high-performance, real-time file sharing application built with Node.js and Socket.IO. Overcomes traditional email limits and browser RAM restrictions for massive file transfers.

## Features

- **Real-time File Sharing**: Share files instantly with all connected users.
- **Massive File Support (10GB+)**: Uses the **File System Access API** to write incoming chunks directly to disk, bypassing browser RAM limits.
- **Chunked Transfer**: Files are split into 1MB chunks for reliability and performance.
- **No Registration**: Join a session with just a name and start sharing.
- **Progress Tracking**: Real-time upload and download progress bars.
- **Modern UI**: Simple drag-and-drop interface with "Direct-to-Disk" option for large files.

## How it works

1. **Join**: Enter your name to join the session.
2. **Upload**: Drag and drop any file into the upload zone.
3. **Synchronize**: The file is split into 1MB chunks and broadcast to all connected users in real-time.
4. **Receive/Download**: 
    - For small files, the browser collects them in RAM and allows instant download.
    - For large files (>50MB), the UI recommends **"Save to Disk"**, which writes the file directly to your hard drive as it arrives, enabling 10GB+ support.

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO (100MB Buffer)
- **Frontend**: Vanilla JavaScript (File System Access API, FileReader, Blobs), HTML5, CSS3

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Access at `http://localhost:3000`

## License

ISC
