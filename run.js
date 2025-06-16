/**
 * Simple script to run the Telegram bot
 */

const path = require('path');
const fs = require('fs');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        console.log('⚠️ .env file not found, copying from .env.example');
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file. Please edit it with your credentials before starting the bot.');
        console.log('📝 You need to set at least TELEGRAM_BOT_TOKEN in the .env file.');
    } else {
        console.log('❌ Neither .env nor .env.example files found. Please create a .env file with your configuration.');
    }
    process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Log the port that will be used
const port = process.env.PORT || process.env.TELEGRAM_PORT || 3001;
console.log(`🔌 Will start server on port ${port}`);

// Start the bot directly
console.log('🚀 Starting Telegram bot...');
require('./src/krypton-telegram.js');

// Handle termination signals
process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down...');
    process.exit(0);
});