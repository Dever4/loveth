/**
 * Voice command for generating voice notes from text
 */

const { sendVoiceNote } = require('../../Handlers/Message');

module.exports = {
    command: {
        name: 'voice',
        aliases: ['tts', 'say'],
        category: 'General',
        description: 'Convert text to a voice note',
        usage: '{prefix}voice <text>',
        example: '{prefix}voice Hello, this is a test message',
        groupOnly: false,
        privateOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            // Get the text to convert
            const text = args.join(' ');
            if (!text) {
                return await ctx.reply('⚠️ Please provide text to convert to voice.');
            }

            // Check if text is too long
            if (text.length > 500) {
                return await ctx.reply('⚠️ Text is too long. Please limit your text to 500 characters.');
            }

            // Send "recording audio" action
            await ctx.telegram.sendChatAction(ctx.chat.id, 'record_voice');

            // Generate and send voice note
            const success = await sendVoiceNote(bot, ctx, text);

            if (!success) {
                await ctx.reply('❌ Failed to generate voice note. Please try again later.');
            }

            // Log the interaction
            console.log(`🎤 Voice note generated for ${ctx.from.username || ctx.from.first_name} (${ctx.from.id})`);
        } catch (error) {
            console.error('❌ Error in voice command:', error);
            await ctx.reply('❌ An error occurred while generating the voice note.');
        }
    }
};