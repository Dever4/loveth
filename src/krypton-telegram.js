const { Telegraf } = require('telegraf')
const { Database } = require('./database')
const { getConfig } = require('./getConfig')
const { Collection } = require('discord.js')
const { MessageHandler } = require('./Handlers/Message')
const GroupUpdateHandler = require('./Handlers/GroupUpdate')
const ChatSessionManager = require('./Handlers/chatSession')
const contact = require('./Helper/contacts')
const utils = require('./Helper/function')
const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const chalk = require('chalk')
const { join } = require('path')
const { readdirSync, remove, existsSync } = require('fs-extra')
const bodyParser = require('body-parser')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET || 'telegram-bot-admin-secret'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// Global connection tracking
global.connected = false
global.connectedBotUsername = null

// Middleware
app.use(bodyParser.json())
app.use(cors({
  origin: '*' // Allow requests from any origin in production
}))

const port = process.env.PORT || process.env.TELEGRAM_PORT || 3001

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ message: 'Authentication required' })

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' })
    req.user = user
    next()
  })
}

const start = async () => {
    // Initialize SQLite database
    const db = new Database();
    await db.init();
    const configTable = db.table('config');
    let instances = await configTable.get('botInstances');

    // If no instances exist, create a default one
    if (!instances || !Array.isArray(instances) || instances.length === 0) {
        instances = [
            {
                id: 1,
                name: 'Telegram Bot 1',
                status: 'disconnected',
                isActive: true,
                sessionPath: 'session',
                lastActive: Date.now(),
                username: null
            }
        ];
        await configTable.set('botInstances', instances);
    }

    // Find active instance
    let activeInstance = instances.find(instance => instance.isActive);
    if (!activeInstance) {
        // If no active instance, set the first one as active
        instances[0].isActive = true;
        activeInstance = instances[0];
        await configTable.set('botInstances', instances);
    }

    console.log(`🤖 Using bot instance: ${activeInstance.name} (ID: ${activeInstance.id})`);

    // Update the last active timestamp for the active instance
    instances = instances.map(instance => ({
        ...instance,
        lastActive: instance.isActive ? Date.now() : instance.lastActive || Date.now()
    }));
    await configTable.set('botInstances', instances);

    // Ensure the session directory exists
    const sessionPath = activeInstance.sessionPath || `session_${activeInstance.id}`;
    const sessionDir = path.join(__dirname, '..', sessionPath);

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`✅ Created session directory for bot ${activeInstance.id}: ${sessionDir}`);
    }

    // Config
    const config = getConfig();
    
    // Check if Telegram token is available
    if (!config.telegramToken) {
        console.error('❌ Telegram bot token is missing. Please set TELEGRAM_BOT_TOKEN in your environment variables.');
        process.exit(1);
    }

    // Create Telegram bot instance
    const bot = new Telegraf(config.telegramToken);
    
    // Store the active instance information in the bot
    bot.instanceId = activeInstance.id;
    bot.isActive = activeInstance.isActive;
    bot.instanceName = activeInstance.name;
    
    // Config
    bot.config = config;

    // Database
    bot.DB = db;
    // Tables
    bot.contactDB = bot.DB.table('contacts');

    // Contacts
    bot.contact = contact;

    // Commands
    bot.cmd = new Collection();

    // Utils
    bot.utils = utils;

    // Chat Session Manager
    bot.chatSessionManager = new ChatSessionManager(bot.DB);

    bot.messagesMap = new Map();

    /**
     * @returns {Promise<string[]>}
     */
    bot.getAllGroups = async () => {
        try {
            const groupsTable = bot.DB.table('groups');
            const groups = await groupsTable.all();
            return groups.map(group => group.id);
        } catch (error) {
            console.error('Error getting all groups:', error);
            return [];
        }
    };

    /**
     * @returns {Promise<string[]>}
     */
    bot.getAllUsers = async () => {
        try {
            const data = (await bot.contactDB.all()).map((x) => x.id);
            return data;
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    };

    // Colourful logging
    bot.log = (text, color = 'green') =>
        color ? console.log(chalk.keyword(color)(text)) : console.log(chalk.green(text));

    // Command Loader
    const loadCommands = async () => {
        const readCommand = (rootDir) => {
            readdirSync(rootDir).forEach(($dir) => {
                const commandFiles = readdirSync(join(rootDir, $dir)).filter((file) => file.endsWith('.js'));
                for (let file of commandFiles) {
                    const cmd = require(join(rootDir, $dir, file));
                    bot.cmd.set(cmd.command.name, cmd);
                    bot.log(`Loaded: ${cmd.command.name.toUpperCase()} from ${file}`);
                }
            });
            bot.log('Successfully Loaded Commands');
        };
        readCommand(join(__dirname, '.', 'Commands'));
    };

    // Set up bot middleware
    bot.use(async (ctx, next) => {
        // Add timestamp to context
        ctx.timestamp = Date.now();
        
        // Add user to contacts if not exists
        if (ctx.from) {
            const userId = ctx.from.id.toString();
            const userExists = await bot.contactDB.has(userId);
            
            if (!userExists) {
                await bot.contactDB.set(userId, {
                    id: userId,
                    name: ctx.from.first_name,
                    username: ctx.from.username || null,
                    isBot: ctx.from.is_bot,
                    lastSeen: Date.now()
                });
                bot.log(`New user added to contacts: ${ctx.from.first_name} (${userId})`);
            } else {
                // Update last seen
                const user = await bot.contactDB.get(userId);
                await bot.contactDB.set(userId, {
                    ...user,
                    lastSeen: Date.now()
                });
            }
        }
        
        await next();
    });

    // Message processing queue to track ongoing conversations
    const processingMessages = new Map();

    // Handle text messages - non-blocking
    bot.on('text', (ctx) => {
        const userId = ctx.from.id.toString();
        const chatId = ctx.chat.id.toString();
        
        // Process message asynchronously without awaiting
        MessageHandler(ctx, bot).catch(err => {
            console.error(`❌ Error handling text message from ${userId}:`, err);
        });
    });

    // Handle photo messages - non-blocking
    bot.on('photo', (ctx) => {
        const userId = ctx.from.id.toString();
        ctx.message.type = 'photo';
        
        // Process message asynchronously without awaiting
        MessageHandler(ctx, bot).catch(err => {
            console.error(`❌ Error handling photo message from ${userId}:`, err);
        });
    });

    // Handle document messages - non-blocking
    bot.on('document', (ctx) => {
        const userId = ctx.from.id.toString();
        ctx.message.type = 'document';
        
        // Process message asynchronously without awaiting
        MessageHandler(ctx, bot).catch(err => {
            console.error(`❌ Error handling document message from ${userId}:`, err);
        });
    });

    // Handle voice messages - non-blocking
    bot.on('voice', (ctx) => {
        const userId = ctx.from.id.toString();
        ctx.message.type = 'voice';
        
        // Process message asynchronously without awaiting
        MessageHandler(ctx, bot).catch(err => {
            console.error(`❌ Error handling voice message from ${userId}:`, err);
        });
    });

    // Handle group updates - non-blocking
    bot.on('new_chat_members', (ctx) => {
        GroupUpdateHandler(ctx, bot, 'add').catch(err => {
            console.error(`❌ Error handling new chat members:`, err);
        });
    });

    bot.on('left_chat_member', (ctx) => {
        GroupUpdateHandler(ctx, bot, 'remove').catch(err => {
            console.error(`❌ Error handling left chat member:`, err);
        });
    });

    // Handle errors
    bot.catch((err, ctx) => {
        console.error(`❌ Error in bot: ${err}`);
    });

    // Start the bot
    try {
        await bot.launch();
        global.connected = true;
        
        // Get bot information
        const botInfo = await bot.telegram.getMe();
        global.connectedBotUsername = botInfo.username;
        
        // Update bot instance status and username
        if (bot.instanceId) {
            try {
                const configTable = bot.DB.table('config');
                let instances = await configTable.get('botInstances') || [];
                
                instances = instances.map(instance => {
                    if (instance.id === bot.instanceId) {
                        return {
                            ...instance,
                            status: 'connected',
                            username: botInfo.username,
                            lastConnected: Date.now()
                        };
                    }
                    return instance;
                });
                await configTable.set('botInstances', instances);
                console.log(`✅ Updated bot instance ${bot.instanceId} status to connected with username @${botInfo.username}`);
                
                // Emit updated bot instances via Socket.IO
                io.emit('botInstances', instances);
            } catch (error) {
                console.error('Error updating bot instance status:', error);
            }
        }
        
        bot.log(`✅ Bot started as @${botInfo.username}`);
        loadCommands();
    } catch (error) {
        console.error('❌ Error starting bot:', error);
    }

    // API Routes
    // Root route for health checks
    app.get('/', (req, res) => {
        res.json({
            status: 'ok',
            message: 'Telegram Bot API is running',
            botStatus: global.connected ? 'connected' : 'disconnected',
            botUsername: global.connectedBotUsername
        });
    });
    
    app.get('/api/status', (req, res) => {
        res.json({
            status: global.connected ? 'connected' : 'disconnected',
            botUsername: global.connectedBotUsername
        });
    });

    // Login route
    app.post('/api/login', (req, res) => {
        const { email, password } = req.body;

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });

    // Protected routes
    app.get('/api/bot-instances', authenticateToken, async (req, res) => {
        try {
            const configTable = db.table('config');
            const instances = await configTable.get('botInstances') || [];
            res.json({ instances });
        } catch (error) {
            console.error('Error getting bot instances:', error);
            res.status(500).json({ message: 'Error getting bot instances' });
        }
    });

    app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

    // Start the server only if not running from server.js
    if (!process.env.RUNNING_FROM_SERVER_JS) {
        http.listen(port, () => {
            console.log(`✅ Server running on port ${port}`);
            console.log(`🌐 Server URL: http://localhost:${port}`);
            console.log(`🔍 Health check endpoint: http://localhost:${port}/`);
        });
    } else {
        console.log(`ℹ️ Skipping HTTP server start (already started by server.js)`);
    }

    // Socket.IO connection
    io.on('connection', (socket) => {
        console.log('Client connected to WebSocket');

        // Send initial bot status
        socket.emit('botStatus', {
            connected: global.connected,
            botUsername: global.connectedBotUsername
        });

        // Send bot instances
        (async () => {
            try {
                const configTable = db.table('config');
                const instances = await configTable.get('botInstances') || [];
                socket.emit('botInstances', instances);
            } catch (error) {
                console.error('Error sending bot instances:', error);
            }
        })();

        socket.on('disconnect', () => {
            console.log('Client disconnected from WebSocket');
        });
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

// Create a simple express app if not starting the full bot
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('⚠️ No TELEGRAM_BOT_TOKEN found. Starting in web-only mode.');
    
    // Create a simple express app
    const express = require('express');
    const app = express();
    
    // Add a health check route
    app.get('/', (req, res) => {
        res.json({
            status: 'ok',
            message: 'Telegram Bot API is running in web-only mode',
            note: 'Bot is not connected because TELEGRAM_BOT_TOKEN is not set'
        });
    });
    
    // Start the server
    // const port = process.env.PORT || process.env.TELEGRAM_PORT || 3001;
    // app.listen(port, () => {
    //     console.log(`✅ Web-only server running on port ${port}`);
    //     console.log(`🌐 Server URL: http://localhost:${port}`);
    // });
} else {
    // Start the bot
    start().catch(err => {
        console.error('❌ Error in main process:', err);
    });
}
