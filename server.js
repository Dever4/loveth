/**
 * Simple server for Render deployment
 * This file is specifically designed for Render and similar platforms
 * that require an HTTP server to be running.
 */

// Load environment variables
require('dotenv').config();

// Set environment variable to indicate we're running from server.js
process.env.RUNNING_FROM_SERVER_JS = 'true';

// Create a simple express app
const express = require('express');
const app = express();

// Initialize global variables
global.connected = false;
global.connectedBotUsername = null;

// Add a health check route
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Telegram Bot API is running',
        botStatus: global.connected ? 'connected' : 'disconnected',
        botUsername: global.connectedBotUsername,
        uptime: process.uptime() + ' seconds'
    });
});

// Add a ping route
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Start the server
const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log(`🔍 Health check endpoint: http://localhost:${port}/`);
});

// Start the bot in the background
console.log('🚀 Starting Telegram bot in the background...');
require('./src/krypton-telegram.js');

// Handle termination signals
process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down...');
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down...');
    server.close();
    process.exit(0);
});