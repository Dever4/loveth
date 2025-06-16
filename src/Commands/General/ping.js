/**
 * Ping command for Telegram bot
 */

module.exports = {
    command: {
        name: 'ping',
        aliases: ['latency', 'p'],
        category: 'General',
        description: 'Check the bot\'s response time',
        usage: '{prefix}ping',
        example: '{prefix}ping',
        groupOnly: false,
        privateOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            const start = Date.now();
            
            // Send initial message
            const message = await ctx.reply('🏓 Pinging...');
            
            // Calculate response time
            const end = Date.now();
            const responseTime = end - start;
            
            // Calculate bot uptime
            const uptime = process.uptime() * 1000;
            const uptimeStr = formatUptime(uptime);
            
            // Edit the message with ping results
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                message.message_id,
                null,
                `🏓 Pong!\n\n⏱️ Response time: ${responseTime}ms\n🕒 Bot uptime: ${uptimeStr}`
            );
        } catch (error) {
            console.error('❌ Error in ping command:', error);
            await ctx.reply('❌ An error occurred while executing this command.');
        }
    }
};

/**
 * Format uptime in a human-readable format
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} - Formatted uptime string
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const secondsStr = (seconds % 60).toString().padStart(2, '0');
    const minutesStr = (minutes % 60).toString().padStart(2, '0');
    const hoursStr = (hours % 24).toString().padStart(2, '0');
    
    if (days > 0) {
        return `${days}d ${hoursStr}h ${minutesStr}m ${secondsStr}s`;
    } else if (hours > 0) {
        return `${hoursStr}h ${minutesStr}m ${secondsStr}s`;
    } else if (minutes > 0) {
        return `${minutesStr}m ${secondsStr}s`;
    } else {
        return `${secondsStr}s`;
    }
}