# Krypton Telegram Bot

A Telegram bot based on the Krypton WhatsApp bot, built with Node.js and Telegraf.

## Features

- Command handling system
- Natural language processing with Google's Gemini AI
- SQLite database for persistent storage
- Group management features
- Voice note generation
- Admin panel with web interface

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the `.env.example` file to `.env` and fill in your credentials:
   ```
   cp .env.example .env
   ```
4. Start the bot:
   ```
   npm start
   ```

## Configuration

Edit the `.env` file to configure the bot:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
- `TELEGRAM_BOT_NAME`: The name of your bot
- `TELEGRAM_PREFIX`: Command prefix (default: `/`)
- `TELEGRAM_MODS`: Comma-separated list of moderator Telegram IDs
- `GEMINI_API_KEY`: Your Google Gemini API key for AI features
- `TELEGRAM_DB_PATH`: Path to the SQLite database file
- `JWT_SECRET`: Secret for JWT token generation (admin panel)
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: Credentials for the admin panel
- `TELEGRAM_PORT`: Port for the admin panel web server

## Creating Commands

Commands are stored in the `src/Commands` directory, organized by category:

- `General`: Basic commands available to all users
- `Group`: Commands for group management
- `Dev`: Commands for bot developers/admins

To create a new command, add a JavaScript file to the appropriate category folder with the following structure:

```javascript
module.exports = {
    command: {
        name: 'commandname',
        aliases: ['alias1', 'alias2'],
        category: 'Category',
        description: 'Command description',
        usage: '{prefix}commandname [arguments]',
        example: '{prefix}commandname example',
        groupOnly: false, // Set to true if command should only work in groups
        privateOnly: false, // Set to true if command should only work in private chats
        modsOnly: false // Set to true if command should only be used by moderators
    },
    execute: async (ctx, args, bot) => {
        // Command implementation
        await ctx.reply('Command response');
    }
};
```

## Admin Panel

The bot includes a web-based admin panel accessible at `http://localhost:3001` (or the port specified in your `.env` file).

Features:
- Bot status monitoring
- Command management
- Broadcast messages to users
- Configuration settings

## License

This project is licensed under the terms of the license included with the original Krypton WhatsApp bot.