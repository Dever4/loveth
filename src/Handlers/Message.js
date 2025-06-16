const chalk = require('chalk');
const emojiStrip = require('emoji-strip');
const { CohereClient } = require("cohere-ai");
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ChatSessionManager = require('./chatSession');

/**
 * Simulates realistic human typing by showing typing indicator periodically
 * @param {Object} ctx - The Telegram context
 * @param {String} chatId - The chat ID
 * @param {Number} duration - Total duration to simulate typing in milliseconds
 * @returns {Promise<void>}
 */
async function simulateHumanTyping(ctx, chatId, duration) {
    // Telegram typing indicator typically times out after ~5 seconds
    // So we need to send it periodically during longer delays
    const interval = 4000; // Send typing indicator every 4 seconds
    let elapsed = 0;
    
    // Send initial typing indicator
    await ctx.telegram.sendChatAction(chatId, 'typing');
    
    // Set up interval to keep showing typing
    const typingInterval = setInterval(async () => {
        elapsed += interval;
        if (elapsed < duration) {
            await ctx.telegram.sendChatAction(chatId, 'typing');
        } else {
            clearInterval(typingInterval);
        }
    }, interval);
    
    // Return a promise that resolves after the duration
    return new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Simulates recording a voice message by showing recording indicator periodically
 * @param {Object} ctx - The Telegram context
 * @param {String} chatId - The chat ID
 * @param {Number} duration - Total duration to simulate recording in milliseconds
 * @returns {Promise<void>}
 */
async function simulateRecording(ctx, chatId, duration) {
    // Telegram recording indicator typically times out after ~5 seconds
    // So we need to send it periodically during longer delays
    const interval = 4000; // Send recording indicator every 4 seconds
    let elapsed = 0;
    
    // Send initial recording indicator
    await ctx.telegram.sendChatAction(chatId, 'record_voice');
    
    // Set up interval to keep showing recording
    const recordingInterval = setInterval(async () => {
        elapsed += interval;
        if (elapsed < duration) {
            await ctx.telegram.sendChatAction(chatId, 'record_voice');
        } else {
            clearInterval(recordingInterval);
        }
    }, interval);
    
    // Return a promise that resolves after the duration
    return new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Simulates uploading a video by showing upload video indicator periodically
 * @param {Object} ctx - The Telegram context
 * @param {String} chatId - The chat ID
 * @param {Number} duration - Total duration to simulate video upload in milliseconds
 * @returns {Promise<void>}
 */
async function simulateVideoUpload(ctx, chatId, duration) {
    // Telegram upload indicator typically times out after ~5 seconds
    // So we need to send it periodically during longer delays
    const interval = 4000; // Send upload indicator every 4 seconds
    let elapsed = 0;
    
    // Send initial upload video indicator
    await ctx.telegram.sendChatAction(chatId, 'upload_video');
    
    // Set up interval to keep showing upload status
    const uploadInterval = setInterval(async () => {
        elapsed += interval;
        if (elapsed < duration) {
            await ctx.telegram.sendChatAction(chatId, 'upload_video');
        } else {
            clearInterval(uploadInterval);
        }
    }, interval);
    
    // Return a promise that resolves after the duration
    return new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Calls the Cohere AI model to determine the intent of a natural language message.
 *
 * @param {string} query - The user's natural language message.
 * @returns {Promise<object>} - Parsed response as { action: "command" } or { action: "reply" }.
 */
async function getCohereIntent(query) {
    try {
        const apiKey = process.env.COHERE_API_KEY;
        if (!apiKey) {
            console.error("⚠️ Cohere API key is missing.");
            return { action: "reply", response: "🟥 AI services are unavailable." };
        }

        const cohere = new CohereClient({ 
            token: apiKey 
        });

        const systemPrompt = `You are Kai Trade Admin, a trading expert for Gidi Banks' financial program.
CRITICAL: KEEP ALL RESPONSES UNDER 100 CHARACTERS TOTAL. NO EXCEPTIONS.

RESPONSE RULES (MANDATORY):
- NEVER EXCEED 100 CHARACTERS TOTAL
- SEND ONLY ONE VERY SHORT MESSAGE
- NO GREETINGS LIKE "HI" OR "HELLO"
- NO PHRASES LIKE "I'M READY TO ASSIST"
- NO ASKING HOW THEY ARE DOING
- TALK ONLY ABOUT TRADING AND MAKING MONEY

EXAMPLES OF GOOD RESPONSES:
- "So we are gonna use the trading platform: Pocket Option"
- "Binary trading is simple—it's about predicting whether an asset's value will rise or fall."
- "With my experience, I'll guide you on what and when to trade on."
- "Are you ready to see BIG PROFITS rolling in soon 💰?"

IMPORTANT INSTRUCTIONS:
1. When user asks for emails: "🔄 Fetching emails..."
2. When user asks for datastation balance: "🔄 Fetching datastation balance..."
3. When user asks about someone's email: "🔄 Fetching user data..."
4. For commands: {"action": "command", "command": "<commandName>", "args": "<arguments>"}
5. For ALL other messages: ONE SHORT SENTENCE (UNDER 100 CHARACTERS)`;

        const response = await cohere.chat({
            model: "command",  // Using Cohere's command model
            message: query,
            preamble: systemPrompt,
            temperature: 0.7,
            connectors: [],
            documents: []
        });

        let text = response.text;
        console.log("🔵 AI Raw Response:", text);

        // Enforce character limit - truncate to 100 characters if longer
        if (text.length > 100 && !text.startsWith('{"action":')) {
            text = text.substring(0, 97) + "...";
            console.log("✂️ Truncated response to 100 characters:", text);
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            console.warn("⚠️ AI response was not valid JSON, treating as plain text.");
            return { action: "reply", response: text };
        }
    } catch (error) {
        console.error("🚨 Cohere API error:", error);
        return { action: "reply", response: "🟥 AI service is currently unavailable." };
    }
}



/**
 * Sends a voice note to the user.
 *
 * @param {object} bot - The Telegram bot instance.
 * @param {object} ctx - The context object.
 * @param {string} text - The text to convert to speech.
 * @returns {Promise<boolean>} - Whether the voice note was sent successfully.
 */
async function sendVoiceNote(bot, ctx, text) {
    try {
        // Create a unique filename for this voice note
        const voiceNotesDir = path.join(__dirname, '../../temp/voice-notes');
        const customVoiceDir = path.join(__dirname, '../../custom-voice');

        // Create directories if they don't exist
        if (!fs.existsSync(voiceNotesDir)) {
            fs.mkdirSync(voiceNotesDir, { recursive: true });
        }

        if (!fs.existsSync(customVoiceDir)) {
            fs.mkdirSync(customVoiceDir, { recursive: true });
        }

        const fileName = `voice_${Date.now()}.mp3`;
        const filePath = path.join(voiceNotesDir, fileName);

        // Check if we should use custom voice from SQLite
        const configTable = bot.DB ? bot.DB.table('config') : null;
        const useCustomVoice = configTable ? await configTable.get('useCustomVoice') : false;

        if (useCustomVoice) {
            try {
                // Check if we have custom voice samples
                const customVoiceSamples = fs.readdirSync(customVoiceDir)
                    .filter(file => file.endsWith('.mp3') || file.endsWith('.wav'));

                if (customVoiceSamples.length > 0) {
                    console.log(`🎤 Using custom voice from ${customVoiceSamples.length} available samples`);

                    // Select a random sample from the available custom voice files
                    const randomSample = customVoiceSamples[Math.floor(Math.random() * customVoiceSamples.length)];
                    const samplePath = path.join(customVoiceDir, randomSample);

                    // Copy the sample to our output file
                    fs.copyFileSync(samplePath, filePath);

                    // Send the voice note
                    await ctx.replyWithVoice({ source: filePath });

                    console.log("🎤 Custom voice note sent successfully");

                    // Clean up the file
                    fs.unlinkSync(filePath);

                    return true;
                } else {
                    console.log("⚠️ Custom voice enabled but no samples found, falling back to TTS");
                }
            } catch (customVoiceError) {
                console.error("🚨 Error using custom voice:", customVoiceError);
                console.log("⚠️ Falling back to standard TTS");
            }
        }

        // If custom voice failed or is disabled, use text-to-speech
        // First try to use google-tts-api if available
        try {
            const googleTTS = require('google-tts-api');

            // Get voice gender and language from SQLite config or use defaults
            const voiceGender = configTable ? await configTable.get('voiceGender') || 'male' : 'male';
            const voiceLanguage = configTable ? await configTable.get('voiceLanguage') || 'en' : 'en';

            console.log(`🎤 Using Google TTS with ${voiceGender} voice in language: ${voiceLanguage}`);

            // Get audio URL
            const url = googleTTS.getAudioUrl(text, {
                lang: voiceLanguage,
                slow: false,
                host: 'https://translate.google.com',
            });
            
            // Download the audio file
            const response = await fetch(url);
            const buffer = await response.buffer();
            
            // Save the buffer to a file
            fs.writeFileSync(filePath, buffer);

            // Send the voice note
            await ctx.replyWithVoice({ source: filePath });

            console.log("🎤 Google TTS voice note sent successfully");

            // Clean up the file
            fs.unlinkSync(filePath);

            return true;
        } catch (googleTTSError) {
            console.error("⚠️ Google TTS failed, falling back to Windows TTS:", googleTTSError);

            // Fallback to Windows TTS
            return new Promise((resolve) => {
                // Clean the text for command line usage - handle apostrophes and quotes
                const cleanText = text.replace(/"/g, '').replace(/'/g, '').replace(/\n/g, ' ');

                // Get voice gender from config or use default
                const voiceGender = 'Male'; // Hardcoded to avoid Promise issues

                // PowerShell command to generate speech
                const command = `powershell -Command "Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Rate = 0; $speak.Volume = 100; $speak.SelectVoiceByHints('${voiceGender}'); $speak.SetOutputToWaveFile('${filePath}'); $speak.Speak(\"${cleanText}\"); $speak.Dispose()"`;

                exec(command, async (error) => {
                    if (error) {
                        console.error("🚨 Error generating voice note:", error);
                        resolve(false);
                        return;
                    }

                    try {
                        // Check if file exists and has content
                        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
                            console.error("🚨 Voice note file is empty or doesn't exist");
                            resolve(false);
                            return;
                        }

                        // Send the voice note
                        await ctx.replyWithVoice({ source: filePath });

                        console.log("🎤 Windows TTS voice note sent successfully");

                        // Clean up the file
                        fs.unlinkSync(filePath);

                        resolve(true);
                    } catch (sendError) {
                        console.error("🚨 Error sending voice note:", sendError);
                        resolve(false);
                    }
                });
            });
        }
    } catch (error) {
        console.error("🚨 Error in sendVoiceNote:", error);
        return false;
    }
}

/**
 * Handle the trading conversation flow
 * @param {Object} ctx - The Telegram context
 * @param {Object} bot - The bot instance
 * @returns {Promise<void>}
 */
async function handleTradingConversation(ctx, bot) {
    try {
        const userId = ctx.from.id.toString();
        const chatId = ctx.chat.id.toString();
        const conversationStateTable = bot.DB.table('conversationState');
        
        // Show typing indicator and send first message
        await simulateHumanTyping(ctx, chatId, 3000); // Simulate typing for 3 seconds
        await ctx.reply('Alright, let\'s get started!');
        
        // Simulate typing for the second message (longer message, longer typing time)
        const delay1 = 6000 + Math.floor(Math.random() * 2000); // 6-8 seconds
        await simulateHumanTyping(ctx, chatId, delay1);
        await ctx.reply('Binary trading is simple—it\'s about predicting whether an asset\'s value will rise or fall within a specific timeframe.');
        
        // Simulate typing for the third message
        const delay2 = 5000 + Math.floor(Math.random() * 2000); // 5-7 seconds
        await simulateHumanTyping(ctx, chatId, delay2);
        await ctx.reply('With my experience, I\'ll guide you on what and when to trade on.');
        
        // Simulate typing for the fourth message
        const delay3 = 7000 + Math.floor(Math.random() * 2000); // 7-9 seconds
        await simulateHumanTyping(ctx, chatId, delay3);
        await ctx.reply('Are you ready to see BIG PROFITS rolling in soon? 💰');
        
        // Update conversation state
        await conversationStateTable.set(userId, { stage: 'trading_explained', lastUpdate: Date.now() });
    } catch (error) {
        console.error("🚨 Error in handleTradingConversation:", error);
    }
}

// Export the functions so they can be used by other modules
module.exports.sendVoiceNote = sendVoiceNote;
module.exports.getCohereIntent = getCohereIntent;
module.exports.handleTradingConversation = handleTradingConversation;
module.exports.simulateHumanTyping = simulateHumanTyping;
module.exports.simulateRecording = simulateRecording;
module.exports.simulateVideoUpload = simulateVideoUpload;

// Export the main message handler
module.exports.MessageHandler = async (ctx, bot) => {
    try {
        // Initialize chat session manager if not already done
        if (!bot.chatSessionManager) {
            bot.chatSessionManager = new ChatSessionManager(bot.DB);
        }

        // Get message text
        const text = ctx.message.text || '';
        
        // Skip empty messages
        if (!text.trim()) return;
        
        // Convert text to lowercase for easier comparison
        const lowerText = text.toLowerCase().trim();
        
        // Get user information
        const userId = ctx.from.id.toString();
        const userName = ctx.from.first_name;
        const chatId = ctx.chat.id.toString();
        const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
        
        // Get conversation state
        const conversationStateTable = bot.DB.table('conversationState');
        let conversationState = await conversationStateTable.get(userId) || { stage: 'none', lastUpdate: Date.now() };
        
        // Start the conversation if this is the first message or /start command
        if (conversationState.stage === 'none' || text.trim() === '/start') {
            // Simulate human typing for a more natural experience
            await simulateHumanTyping(ctx, chatId, 5000); // 5 seconds of typing
            
            await ctx.reply('Hi, I\'m Loveth');
            
            // Simulate typing for the second message
            await simulateHumanTyping(ctx, chatId, 8000); // 8 seconds of typing
            
            await ctx.reply('If you are looking for profitable signals and a solid trading mentor, you made the best decision by writing to me❤️\nBefore we dive in, I\'d love to learn a bit about you. What\'s your name and where are you from?');
            
            // Update conversation state to wait for first response
            await conversationStateTable.set(userId, { stage: 'start_1', lastUpdate: Date.now() });
            return;
        }
        
        // Handle the conversation flow after /start
        if (conversationState.stage === 'start_1') {
            // This is where the user has sent their name and location
            // Simulate human typing for a more natural experience
            await simulateHumanTyping(ctx, chatId, 6000); // 6 seconds of typing
            
            // Extract the user's name from their message
            let userProvidedName = '';
            
            // Look for common name patterns
            if (text.toLowerCase().includes('my name is')) {
                // Extract name after "my name is"
                userProvidedName = text.toLowerCase().split('my name is')[1].trim().split(' ')[0];
            } else if (text.toLowerCase().includes('i am')) {
                // Extract name after "i am"
                userProvidedName = text.toLowerCase().split('i am')[1].trim().split(' ')[0];
            } else if (text.toLowerCase().includes('i\'m')) {
                // Extract name after "i'm"
                userProvidedName = text.toLowerCase().split('i\'m')[1].trim().split(' ')[0];
            } else {
                // If no pattern found, just use the first word that's not "hi", "hello", etc.
                const words = text.split(' ');
                const greetings = ['hi', 'hello', 'hey', 'greetings', 'howdy'];
                for (const word of words) {
                    if (!greetings.includes(word.toLowerCase()) && word.length > 1) {
                        userProvidedName = word;
                        break;
                    }
                }
                
                // If still no name found, use a generic term
                if (!userProvidedName) {
                    userProvidedName = 'there';
                }
            }
            
            // Capitalize the first letter of the name
            userProvidedName = userProvidedName.charAt(0).toUpperCase() + userProvidedName.slice(1);
            
            await ctx.reply(`Nice to meet you ${userProvidedName} 😉\nThe best part about working with me that you can copying my signals and earn big profit with no experience at all and also learn how to read market by educational materials that are in my VIP Group!\nI post 16 signals and new strategies up there daily and its absolutely free! Do you want to join?`);
            
            // Update conversation state to wait for second response
            await conversationStateTable.set(userId, { stage: 'start_2', lastUpdate: Date.now() });
            return;
        }
        
        if (conversationState.stage === 'start_2') {
            // Check for negative responses
            const negativeWords = ['no', 'nope', 'nah', 'not', 'don\'t', 'dont', 'not interested', 'no thanks', 'no thank you', 'pass'];
            const isNegative = negativeWords.some(word => 
                lowerText === word || 
                lowerText.includes(word) || 
                lowerText.startsWith(word + ' ')
            );
            
            // If user says no, don't proceed further
            if (isNegative) {
                // End the conversation without sending any more messages
                await conversationStateTable.set(userId, { stage: 'declined', lastUpdate: Date.now() });
                return;
            }
            
            // If response is positive, continue with the conversation
            // Simulate typing for the first message
            await simulateHumanTyping(ctx, chatId, 5000); // 5 seconds of typing
            
            // Send the message with proper spacing as requested
            await ctx.reply('To join my VIP Group and get 16 signals📊\n\nYou need only 2 minutes of your time and follow simple steps ⚡️\n\n1. Register an account using my link (you will receive 50% to your deposit with my link)\nhttps://pocket1.click/smart/LmMX9SOEgMlUxD\n\n2. Send me your pocket option ID (so I can verify your registration)');
            
            // Wait a moment before continuing (to make it seem like the bot is waiting for a response)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Send videos and other content
            await sendRegistrationContent(ctx, chatId, bot);
            
            // Update conversation state to registration_complete
            await conversationStateTable.set(userId, { stage: 'registration_complete', lastUpdate: Date.now() });
            return;
        }
        
        // This function handles sending all the registration content
        async function sendRegistrationContent(ctx, chatId, bot) {
            try {
                // Function to send a video with timeout handling
                const sendVideoWithTimeout = async (videoPath, videoNumber) => {
                    try {
                        // Show upload indicator for 3 seconds before sending
                        await simulateVideoUpload(ctx, chatId, 3000);
                        
                        // Send the video with a timeout
                        const sendPromise = ctx.replyWithVideo({ source: videoPath });
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error(`Video ${videoNumber} upload timed out`)), 180000) // 3 minutes timeout
                        );
                        
                        // Race the promises
                        const result = await Promise.race([sendPromise, timeoutPromise]);
                        
                        // If we get here, the video was sent successfully
                        console.log(`🎬 Video ${videoNumber} sent successfully`);
                        return result;
                    } catch (error) {
                        console.error(`⚠️ Error with video ${videoNumber}:`, error.message);
                        // Don't throw, just log and continue
                        return null;
                    }
                };
                
                // Send first video with caption
                const videoPath1 = path.join(__dirname, '../video/video1.mp4');
                // Check if file exists before trying to send
                if (fs.existsSync(videoPath1)) {
                    try {
                        // Show upload indicator
                        await simulateVideoUpload(ctx, chatId, 3000);
                        
                        // Send video with caption
                        await ctx.replyWithVideo(
                            { source: videoPath1 },
                            { 
                                caption: "🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\nWATCH OUR DETAILED VIDEO TO  GET STARTED IMMEDIATELY \nTHEN REGISTER BELOW!!! ⬇️\nhttps://pocket1.click/smart/LmMX9SOEgMlUxD"
                            }
                        );
                        console.log("🎬 Video 1 with caption sent successfully");
                    } catch (videoError) {
                        console.error("Error sending first video:", videoError);
                        // If video fails, send the caption as a regular message
                        await ctx.reply("🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\nWATCH OUR DETAILED VIDEO TO  GET STARTED IMMEDIATELY \nTHEN REGISTER BELOW!!! ⬇️\nhttps://pocket1.click/smart/LmMX9SOEgMlUxD");
                    }
                } else {
                    console.error(`Video file not found: ${videoPath1}`);
                    // Send the caption as a regular message if video not found
                    await ctx.reply("🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\nWATCH OUR DETAILED VIDEO TO  GET STARTED IMMEDIATELY \nTHEN REGISTER BELOW!!! ⬇️\nhttps://pocket1.click/smart/LmMX9SOEgMlUxD");
                }
                
                // Brief delay before second video
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Send second video with caption about UID
                const videoPath2 = path.join(__dirname, '../video/video2.mp4');
                if (fs.existsSync(videoPath2)) {
                    try {
                        // Show upload indicator
                        await simulateVideoUpload(ctx, chatId, 3000);
                        
                        // Send video with caption
                        await ctx.replyWithVideo(
                            { source: videoPath2 },
                            { 
                                caption: "How to copy your UID Number"
                            }
                        );
                        console.log("🎬 Video 2 with caption sent successfully");
                    } catch (videoError) {
                        console.error("Error sending second video:", videoError);
                        // If video fails, send the caption as a regular message
                        await ctx.reply("How to copy your UID Number");
                    }
                } else {
                    console.error(`Video file not found: ${videoPath2}`);
                    // Send the caption as a regular message if video not found
                    await ctx.reply("How to copy your UID Number");
                }
                
                // Simulate recording audio for 5 seconds
                await simulateRecording(ctx, chatId, 5000);
                
                // Send the audio file
                const audioPath = path.join(__dirname, '../audio/greeting.ogg');
                if (fs.existsSync(audioPath)) {
                    try {
                        await ctx.replyWithVoice({ source: audioPath });
                        console.log("🎤 Voice message sent successfully");
                    } catch (err) {
                        console.error("🚨 Error sending voice message:", err.message);
                    }
                } else {
                    console.error(`Audio file not found: ${audioPath}`);
                    
                    // Skip TTS and just send a text message instead
                    await ctx.reply("Welcome to our trading community! I'm excited to help you start making profits. Follow my signals closely and don't hesitate to ask if you have any questions.");
                }
                
                // Send follow-up messages with delays to simulate natural conversation
                await simulateHumanTyping(ctx, chatId, 3000);
                await ctx.reply("2️⃣ Important‼️ Make sure to fill in your details manually. Don't register through Google or Facebook account.");
                
                await simulateHumanTyping(ctx, chatId, 4000);
                await ctx.reply("After successful registration it's important that you make the deposit as quick as you can exactly on NEW account");
                
                await simulateHumanTyping(ctx, chatId, 3000);
                await ctx.reply("remember that first deposit should be at least $10 (converted to your currency).");
                
                await simulateHumanTyping(ctx, chatId, 3500);
                await ctx.reply("But to be real, you don't want to go below $50.");
                
                await simulateHumanTyping(ctx, chatId, 4000);
                await ctx.reply("Most people kick off with $100 or more to aim for bigger profits 💰");
                
                await simulateHumanTyping(ctx, chatId, 5000);
                await ctx.reply("After you deposit on your trading account you will be ready to trade with my signals and I'll add you into my VIP gang ✨");
            } catch (error) {
                console.error("🚨 Error in sendRegistrationContent:", error);
            }
        }
        
        // Handle any messages from users who are in the waiting_for_id stage
        // This is a fallback in case they somehow got into this state
        if (conversationState.stage === 'waiting_for_id') {
            // Just update their state to registration_complete
            await conversationStateTable.set(userId, { stage: 'registration_complete', lastUpdate: Date.now() });
            
            // Send a simple acknowledgment
            await ctx.reply('Your registration is already complete! You\'re all set to receive my trading signals. 🚀');
            return;
        }
        
        // Log the message
        bot.log(`📩 Message from ${userName} (${userId}): ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`, 'blue');
        
        // Update last activity
        const lastActivityTable = bot.DB.table('lastActivity');
        await lastActivityTable.set(userId, Date.now());
        
        // Check for affirmative responses
        const affirmativeWords = [
            'yeah', 'yes', 'yep', 'sure', 'ready', 'i am ready', 'i\'m ready', 
            'ok', 'okay', 'yea', 'ye', 'y', 'yup', 'alright', 'fine', 'good', 
            'great', 'cool', 'sounds good', 'let\'s do it', 'let\'s go', 'go ahead',
            'definitely', 'absolutely', 'of course', 'certainly', 'indeed', 'right',
            'true', 'affirmative', 'roger', 'aye', 'agreed', 'gladly', 'willingly',
            'by all means', 'no problem', 'for sure', 'exactly', 'precisely',
            'tell me', 'show me', 'i want to know', 'please', 'proceed', 'continue',
            'i do', 'i will', 'i want', 'i\'d like', 'interested', 'tell me more',
            'go on', 'carry on', 'keep going', 'next', 'what\'s next', 'what next',
            'i\'m listening', 'listening', 'i hear you', 'understood', 'got it',
            'i get it', 'makes sense', 'clear', 'crystal clear', 'perfect',
            'wonderful', 'amazing', 'fantastic', 'excellent', 'superb', 'terrific',
            'outstanding', 'brilliant', 'marvelous', 'splendid', 'fabulous',
            'i\'m in', 'count me in', 'sign me up', 'i\'m game', 'i\'m down',
            'let\'s hear it', 'hit me', 'shoot', 'fire away', 'lay it on me',
            'i\'m all ears', 'i\'m interested', 'tell me about it', 'explain',
            'elaborate', 'give me details', 'more info', 'more information',
            'details please', 'how', 'what', 'when', 'where', 'why', 'who',
            'which', 'whose', 'whom', 'whatever', 'whenever', 'wherever',
            'however', 'whichever', 'whomever', 'whatsoever', 'let me know',
            'inform me', 'educate me', 'enlighten me', 'teach me', 'guide me',
            'help me understand', 'help me learn', 'help me know', 'help me see',
            'help me grasp', 'help me comprehend', 'help me get it', 'help me follow',
            'help me keep up', 'help me catch up', 'help me stay on track',
            'help me stay focused', 'help me stay engaged', 'help me stay interested',
            'help me stay motivated', 'help me stay inspired', 'help me stay excited',
            'help me stay enthusiastic', 'help me stay passionate', 'help me stay driven',
            'help me stay determined', 'help me stay committed', 'help me stay dedicated',
            'help me stay devoted', 'help me stay loyal', 'help me stay faithful',
            'help me stay true', 'help me stay honest', 'help me stay sincere',
            'help me stay genuine', 'help me stay authentic', 'help me stay real',
            'help me stay truthful', 'help me stay factual', 'help me stay accurate',
            'help me stay precise', 'help me stay exact', 'help me stay specific',
            'help me stay detailed', 'help me stay thorough', 'help me stay comprehensive',
            'help me stay complete', 'help me stay full', 'help me stay whole',
            'help me stay entire', 'help me stay total', 'help me stay absolute',
            'help me stay utter', 'help me stay sheer', 'help me stay pure',
            'help me stay clean', 'help me stay clear', 'help me stay transparent',
            'help me stay open', 'help me stay honest', 'help me stay forthright',
            'help me stay straightforward', 'help me stay direct', 'help me stay blunt',
            'help me stay frank', 'help me stay candid', 'help me stay outspoken',
            'help me stay vocal', 'help me stay verbal', 'help me stay articulate',
            'help me stay eloquent', 'help me stay fluent', 'help me stay smooth',
            'help me stay flowing', 'help me stay seamless', 'help me stay continuous',
            'help me stay uninterrupted', 'help me stay unbroken', 'help me stay intact',
            'help me stay whole', 'help me stay complete', 'help me stay full',
            'help me stay total', 'help me stay absolute', 'help me stay utter',
            'help me stay sheer', 'help me stay pure', 'help me stay clean',
            'help me stay clear', 'help me stay transparent', 'help me stay open'
        ];
        
        // Check if the message contains any affirmative word or is generally positive
        const isAffirmative = affirmativeWords.some(word => 
            lowerText === word || 
            lowerText.includes(word) || 
            (lowerText.length < 5 && !lowerText.includes('no') && !lowerText.includes('nah') && !lowerText.includes('nope'))
        );
        
        // Handle based on conversation stage
        if (isAffirmative && conversationState.stage === 'intro') {
            await handleTradingConversation(ctx, bot);
            return;
        }
        
        // Check if this is a response to the "do you want to join my team?" question
        if (isAffirmative && conversationState.stage === 'trading_explained') {
            // Simulate typing for the first message
            await simulateHumanTyping(ctx, chatId, 5000); // 5 seconds of typing
            
            // Simple text response
            await ctx.reply('Awesome! 😊');
            
            // Simulate typing for the second message (promotional message)
            await simulateHumanTyping(ctx, chatId, 7000); // 7 seconds of typing
            await ctx.reply('Let\'s kickstart your trading journey quickly! Follow these steps to unlock my 12+ exclusive signals and expert strategies: 🤑\nhttps://pocket1.click/smart/LmMX9SOEgMlUxD');
            
            // Simulate typing for the third message (important note)
            await simulateHumanTyping(ctx, chatId, 7000); // 7 seconds of typing
            await ctx.reply('2️⃣ Important‼️ Make sure to fill in your details manually. Don\'t register through Google or Facebook account.');
            
            // Simulate typing for the fourth message (promo code)
            await simulateHumanTyping(ctx, chatId, 7000); // 7 seconds of typing
            await ctx.reply('my promo code: 50START but it\'s not obligated to use');
            
            // Simulate recording audio for 5 seconds (reduced from 10 to prevent timeouts)
            await simulateRecording(ctx, chatId, 5000);
            
            // Update conversation state first to ensure it happens even if media sending fails
            await conversationStateTable.set(userId, { stage: 'registration_sent', lastUpdate: Date.now() });
            
            try {
                // Function to send a video with timeout handling
                const sendVideoWithTimeout = async (videoPath, videoNumber) => {
                    try {
                        // Show upload indicator for 3 seconds before sending
                        await ctx.telegram.sendChatAction(chatId, 'upload_video');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Send the video with a timeout
                        const sendPromise = ctx.replyWithVideo({ source: videoPath });
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error(`Video ${videoNumber} upload timed out`)), 180000) // Increased to 3 minutes
                        );
                        
                        // Race the promises
                        const result = await Promise.race([sendPromise, timeoutPromise]);
                        
                        // If we get here, the video was sent successfully
                        console.log(`🎬 Video ${videoNumber} sent successfully`);
                        return result;
                    } catch (error) {
                        console.error(`⚠️ Error with video ${videoNumber}:`, error.message);
                        // Don't throw, just log and continue
                        return null;
                    }
                };
                
                // Send the audio file
                const audioPath = path.join(__dirname, '../audio/greeting.ogg');
                await ctx.replyWithVoice({ source: audioPath }).catch(err => {
                    console.error("🚨 Error sending voice message:", err.message);
                });
                console.log("� Voice message sent successfully");
                
                // Send first video
                const videoPath1 = path.join(__dirname, '../video/video1.mp4');
                // Check if file exists before trying to send
                if (fs.existsSync(videoPath1)) {
                    try {
                        await sendVideoWithTimeout(videoPath1, 1);
                    } catch (videoError) {
                        console.error("Error sending first video:", videoError);
                        // Continue even if video fails
                    }
                } else {
                    console.error(`Video file not found: ${videoPath1}`);
                    await ctx.reply("I wanted to show you a video tutorial, but there was an issue. Let's continue!");
                }
                
                // Brief delay before second video
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Send second video with caption about UID
                const videoPath2 = path.join(__dirname, '../video/video2.mp4');
                if (fs.existsSync(videoPath2)) {
                    try {
                        // Use the same timeout mechanism for the second video
                        await sendVideoWithTimeout(videoPath2, 2);
                        // Send the caption as a separate message if the video sends successfully
                        await ctx.reply("Where to copy your uid number");
                    } catch (videoError) {
                        console.error("Error sending second video:", videoError);
                        // Continue even if video fails
                    }
                } else {
                    console.error(`Video file not found: ${videoPath2}`);
                    await ctx.reply("I wanted to show you where to copy your UID number, but there was an issue with the video.");
                }
                
                // Send follow-up messages with typing indicators to simulate natural conversation
                const delay1 = 5000 + Math.floor(Math.random() * 1000); // 5-6 seconds
                await simulateHumanTyping(ctx, chatId, delay1);
                await ctx.reply('After successful registration it\'s important that you make the deposit as quick as you can exactly on NEW account');
                
                const delay2 = 3000 + Math.floor(Math.random() * 1000); // 3-4 seconds
                await simulateHumanTyping(ctx, chatId, delay2);
                await ctx.reply('remember that first deposit should be at least $10 (converted to your currency).');
                
                const delay3 = 4000 + Math.floor(Math.random() * 1000); // 4-5 seconds
                await simulateHumanTyping(ctx, chatId, delay3);
                await ctx.reply('But to be real, you don\'t want to go below $50.');
                
                const delay4 = 4000 + Math.floor(Math.random() * 1000); // 4-5 seconds
                await simulateHumanTyping(ctx, chatId, delay4);
                await ctx.reply('Most people kick off with $100 or more to aim for bigger profits 💰');
                
                const delay5 = 3000 + Math.floor(Math.random() * 1000); // 3-4 seconds
                await simulateHumanTyping(ctx, chatId, delay5);
                await ctx.reply('After you deposit on your trading account you will be ready to trade with my signals and I\'ll add you into my VIP gang ✨');
                
            } catch (error) {
                console.error("🚨 Error in media sending sequence:", error);
                // If there's a catastrophic error, send a text message
                await ctx.reply("I wanted to send you some media files, but there was an issue. Let's continue with text!").catch(() => {});
            }
            return;
        }
        
        // Check if user is saying they've registered
        if (conversationState.stage === 'registration_sent' && 
            (lowerText.includes('register') || lowerText.includes('done') || lowerText.includes('finished') || 
             lowerText.includes('complete') || lowerText.includes('signed up') || lowerText.includes('created account') ||
             lowerText.includes('i did') || lowerText.includes('completed') || lowerText.includes('registered') ||
             lowerText.includes('created') || lowerText.includes('made account') || lowerText.includes('made an account') ||
             lowerText.includes('all set') || lowerText.includes('ready') || isAffirmative)) {
            
            // Simulate typing for the first message
            await simulateHumanTyping(ctx, chatId, 6000); // 6 seconds of typing
            await ctx.reply('Great! 🎉 Now I\'ll add you to our VIP signals group where you\'ll receive 12+ daily signals!');
            
            // Simulate typing for the second message (longer message)
            const delay = 8000 + Math.floor(Math.random() * 2000); // 8-10 seconds
            await simulateHumanTyping(ctx, chatId, delay);
            await ctx.reply('You\'ll start seeing profits right away. Just follow my signals and watch your balance grow! 💰');
            
            // Update conversation state
            await conversationStateTable.set(userId, { stage: 'registration_complete', lastUpdate: Date.now() });
            
            return;
        }
        
        // Handle messages from users who have already completed registration
        if (conversationState.stage === 'registration_complete') {
            // Prepare a list of possible responses for variety
            const responses = [
                'I\'ve already added you to our VIP signals group! You\'ll start receiving signals soon. 📊',
                'Your account is all set up! Just wait for the signals to start coming in. 💰',
                'You\'re all ready to go! I\'ll be sending trading signals shortly. 📈',
                'Everything is set up perfectly! You\'ll receive your first signals soon. ⚡️',
                'You\'re already in our system! Just wait for the signals to start flowing. 🚀'
            ];
            
            // Select a random response
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            // Simulate typing for a natural experience
            await simulateHumanTyping(ctx, chatId, 3000); // 3 seconds of typing
            await ctx.reply(randomResponse);
            return;
        }
        
        // Handle messages from users who declined to join
        if (conversationState.stage === 'declined') {
            // Prepare a list of possible responses for variety
            const responses = [
                'If you change your mind about joining our VIP signals group, just type "join" and we can get started! 📊',
                'No problem! If you ever want to start trading with us, just say "join" and I\'ll help you get set up. 💰',
                'I respect your decision. If you ever want to join our trading group in the future, just let me know! 📈'
            ];
            
            // Select a random response
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            // Check if the user is now interested in joining
            if (lowerText.includes('join') || lowerText.includes('start') || lowerText.includes('yes') || 
                lowerText.includes('okay') || lowerText.includes('interested') || isAffirmative) {
                // Reset their state to start the process again
                await conversationStateTable.set(userId, { stage: 'none', lastUpdate: Date.now() });
                
                // Simulate typing for a natural experience
                await simulateHumanTyping(ctx, chatId, 3000); // 3 seconds of typing
                await ctx.reply('Great! Let\'s start over. I\'ll help you join our VIP trading group.');
                
                // Trigger the start sequence on the next message
                return;
            }
            
            // Simulate typing for a natural experience
            await simulateHumanTyping(ctx, chatId, 3000); // 3 seconds of typing
            await ctx.reply(randomResponse);
            return;
        }
        
        // Check if message starts with prefix
        const prefix = bot.config.prefix;
        if (text.startsWith(prefix)) {
            // Handle commands
            const args = text.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Check if command exists
            if (bot.cmd.has(commandName)) {
                const command = bot.cmd.get(commandName);
                
                // Check if command is for groups only
                if (command.command.groupOnly && !isGroup) {
                    await ctx.reply('⚠️ This command can only be used in groups.');
                    return;
                }
                
                // Check if command is for private chats only
                if (command.command.privateOnly && isGroup) {
                    await ctx.reply('⚠️ This command can only be used in private chats.');
                    return;
                }
                
                // Check if command is for mods only
                if (command.command.modsOnly && !bot.config.mods.includes(userId)) {
                    await ctx.reply('⚠️ This command can only be used by moderators.');
                    return;
                }
                
                // Execute command
                try {
                    await command.execute(ctx, args, bot);
                } catch (error) {
                    console.error(`❌ Error executing command ${commandName}:`, error);
                    await ctx.reply('❌ An error occurred while executing this command.');
                }
                
                return;
            } else {
                // Command not found
                await ctx.reply(`⚠️ Command "${commandName}" not found.`);
                return;
            }
        }
        
        // Default response if no intent was processed
        // Simulate human typing for a more natural experience
        await simulateHumanTyping(ctx, chatId, 5000); // 5 seconds of typing
        await ctx.reply('Ready to start making money with trading? Let me show you how! 💰');
        
        // Update the last activity time again after sending response
        await lastActivityTable.set(userId, Date.now());
    } catch (err) {
        console.error("🚨 Error in MessageHandler:", err);
    }
};