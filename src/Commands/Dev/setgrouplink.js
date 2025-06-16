/**
 * Set group link command for administrators
 */

module.exports = {
    command: {
        name: 'setgrouplink',
        aliases: ['setgroup', 'setlink'],
        category: 'Dev',
        description: 'Set the official group link',
        usage: '{prefix}setgrouplink <link>',
        example: '{prefix}setgrouplink https://t.me/joinchat/abcdefg',
        groupOnly: false,
        privateOnly: false,
        modsOnly: true
    },
    execute: async (ctx, args, bot) => {
        try {
            // Check if user is a moderator
            const userId = ctx.from.id.toString();
            if (!bot.config.mods.includes(userId)) {
                return await ctx.reply('⚠️ This command can only be used by moderators.');
            }

            // Get the link
            const link = args.join(' ');
            if (!link) {
                return await ctx.reply('⚠️ Please provide a group link.');
            }

            // Validate the link (basic check)
            if (!link.startsWith('https://t.me/') && !link.startsWith('https://telegram.me/')) {
                return await ctx.reply('⚠️ Invalid Telegram group link. It should start with https://t.me/ or https://telegram.me/');
            }

            // Save the link to database
            const configTable = bot.DB.table('config');
            await configTable.set('officialGroupLink', link);
            
            // Save the timestamp
            await configTable.set('groupLinkLastUpdated', Date.now());

            // Confirm to the user
            await ctx.reply(`✅ Official group link has been set to:\n${link}`);
            
            // Log the action
            console.log(`🔗 Group link set by ${ctx.from.username || ctx.from.first_name} (${userId}): ${link}`);
        } catch (error) {
            console.error('❌ Error in setgrouplink command:', error);
            await ctx.reply('❌ An error occurred while setting the group link.');
        }
    }
};