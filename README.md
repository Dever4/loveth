# Krypton Telegram Bot

A Telegram bot based on JavaScript.

## Deployment Instructions

### Deploying to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Name**: Your choice (e.g., krypton-telegram-bot)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js` (IMPORTANT: Make sure this is exactly as shown)
   - **Plan**: Free or paid tier based on your needs

   > **IMPORTANT**: Render sometimes ignores the Procfile and uses the npm start script. We've updated both to use server.js, but if you still have issues, manually set the Start Command in the Render dashboard.

4. Add the following environment variables:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
   - `TELEGRAM_BOT_NAME`: Your bot's name
   - `TELEGRAM_PREFIX`: Command prefix (e.g., !)
   - `TELEGRAM_MODS`: Comma-separated list of moderator user IDs
   - `GEMINI_API_KEY`: Your Gemini API key (if using)
   - `COHERE_API_KEY`: Your Cohere API key (if using)
   - `JWT_SECRET`: Secret for JWT token generation
   - `ADMIN_EMAIL`: Admin panel email
   - `ADMIN_PASSWORD`: Admin panel password

5. Deploy your application

### Important Notes

- The bot will automatically use the `PORT` environment variable provided by Render
- Make sure your bot token is valid and the bot is properly configured
- The bot will create a health check endpoint at the root URL (`/`)
- Even if you don't set a `TELEGRAM_BOT_TOKEN`, the server will still run in web-only mode, which is useful for keeping your Render deployment active

## Local Development

1. Clone the repository
2. Create a `.env` file based on `.env.example`
3. Run `npm install`
4. Run `npm run dev` for development with auto-restart
5. Run `npm start` to start the bot normally
6. Run `npm run start:server` to start the bot with the server (recommended for Render-like environments)

## Features

- Conversation flow for user onboarding
- Trading signals and registration process
- Admin panel for bot management
- Multiple bot instances support
- Media sharing capabilities