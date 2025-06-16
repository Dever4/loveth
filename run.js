/**
 * Simple script to run the Telegram bot
 */

const { spawn } = require('child_process');
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

// Start the bot
console.log('🚀 Starting Telegram bot...');
const botProcess = spawn('node', ['src/krypton-telegram.js'], {
    stdio: 'inherit'
});

botProcess.on('close', (code) => {
    console.log(`❌ Bot process exited with code ${code}`);
});

// Handle termination signals
process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down...');
    botProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down...');
    botProcess.kill('SIGTERM');
    process.exit(0);
});