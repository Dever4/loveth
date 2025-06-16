/**
 * Placeholder for group link command
 */

module.exports = {
    command: {
        name: 'grouplink',
        aliases: ['group', 'join', 'invite'],
        category: 'General',
        description: 'This command has been disabled',
        usage: '{prefix}grouplink',
        example: '{prefix}grouplink',
        groupOnly: false,
        privateOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            // Get user information
            const userId = ctx.from.id.toString();
            const userName = ctx.from.first_name;
            
            // Send a message explaining that group links are now sent directly
            await ctx.reply(`Hi ${userName}! Group links are now sent directly by the admin. Please continue chatting with the bot for more information about financial training opportunities.`);
            
            // Log the interaction
            console.log(`🔗 Group link request from ${userName} (${userId}) - command disabled`);
            
        } catch (error) {
            console.error('❌ Error in grouplink command:', error);
            await ctx.reply('❌ An error occurred. Please try again later.');
        }
    }
};