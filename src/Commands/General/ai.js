/**
 * AI command for generating responses using Cohere AI
 */

module.exports = {
    command: {
        name: 'ai',
        aliases: ['ask', 'cohere'],
        category: 'General',
        description: 'Ask the AI a question',
        usage: '{prefix}ai <question>',
        example: '{prefix}ai What are some ways to make money online?',
        groupOnly: false,
        privateOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            // Get the question
            const question = args.join(' ');
            if (!question) {
                return await ctx.reply('⚠️ Please provide a question.');
            }

            // Send typing indicator
            await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

            // Initialize chat session manager if not already done
            if (!bot.chatSessionManager) {
                const ChatSessionManager = require('../../Handlers/chatSession');
                bot.chatSessionManager = new ChatSessionManager(bot.DB);
            }

            // Get user information
            const userId = ctx.from.id.toString();
            const userName = ctx.from.first_name;

            // Generate AI response using chat session manager
            const response = await bot.chatSessionManager.generateAIResponse(userId, userName, question);

            // Send response
            if (response.action === 'reply') {
                await ctx.reply(response.response);
            } else {
                await ctx.reply("I'm not sure how to respond to that. Can you try asking in a different way?");
            }

            // Log the interaction
            console.log(`🤖 AI response generated for ${ctx.from.username || ctx.from.first_name} (${ctx.from.id})`);
            
            // Store interaction in database if needed
            const aiInteractionsTable = bot.DB.table('aiInteractions');
            await aiInteractionsTable.set(`${Date.now()}_${ctx.from.id}`, {
                userId: ctx.from.id.toString(),
                username: ctx.from.username || ctx.from.first_name,
                question,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('❌ Error in AI command:', error);
            await ctx.reply('❌ An error occurred while generating a response. Please try again later.');
        }
    }
};