# Global Code Board

A real-time collaborative code editor where everyone sees and edits the same code simultaneously.

## Features

- 🔄 **Real-time collaboration** - Multiple users can edit code simultaneously
- 💾 **Snapshot sharing** - Save and share code snapshots with unique URLs
- 📱 **Responsive design** - Works on desktop and mobile
- 🚀 **Instant sync** - Changes appear in real-time across all connected users

## Deployment Options

### Option 1: Railway (Recommended for real-time apps)

1. **Fork/Clone this repository**
2. **Sign up at [Railway.app](https://railway.app)**
3. **Connect your GitHub repository**
4. **Deploy automatically** - Railway will detect the Node.js app and deploy it
5. **Get your live URL** - Share with friends!

### Option 2: Render

1. **Fork/Clone this repository**
2. **Sign up at [Render.com](https://render.com)**
3. **Create a new Web Service**
4. **Connect your repository**
5. **Set build command:** `npm install`
6. **Set start command:** `npm start`
7. **Deploy!**

### Option 3: Heroku

1. **Fork/Clone this repository**
2. **Sign up at [Heroku.com](https://heroku.com)**
3. **Install Heroku CLI**
4. **Run commands:**
   ```bash
   heroku create your-app-name
   git push heroku main
   heroku open
   ```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

## How to Use

1. **Open the app** in your browser
2. **Start typing** - your code will sync in real-time
3. **Share with friends** - they'll see your changes instantly
4. **Save snapshots** - click "Save Snapshot" to create shareable links
5. **View snapshots** - click on snapshot links to view saved code

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Real-time:** Socket.IO for live collaboration
- **Deployment:** Railway/Render/Heroku ready

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `RAILWAY_STATIC_URL` - Custom domain for Railway (optional)

---

**Note:** This app uses in-memory storage for snapshots. They will be lost when the server restarts. For production use, consider adding a database.
