/**
 * MyID command for showing users their Telegram User ID
 */

module.exports = {
    command: {
        name: 'myid',
        aliases: ['uid', 'userid', 'id'],
        category: 'General',
        description: 'Shows your Telegram User ID',
        usage: '{prefix}myid',
        example: '{prefix}myid',
        cooldown: 3,
        privateOnly: false,
        groupOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            // Get user information
            const userId = ctx.from.id.toString();
            const userName = ctx.from.first_name;
            
            // Create a message showing the user's ID
            const message = `
📋 *YOUR TELEGRAM USER ID*

👤 Name: ${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}
🆔 User ID: \`${userId}\`

ℹ️ Copy this ID when requested during registration.
`;
            
            // Send the message with the user's ID
            await ctx.replyWithMarkdown(message);
            
            // Log the interaction
            console.log(`🆔 User ID requested by ${ctx.from.username || ctx.from.first_name} (${userId})`);
            
        } catch (error) {
            console.error('❌ Error in myid command:', error);
            await ctx.reply('❌ An error occurred while processing your request.');
        }
    }
};