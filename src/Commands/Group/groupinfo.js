/**
 * Group info command for displaying information about the current group
 */

module.exports = {
    command: {
        name: 'groupinfo',
        aliases: ['group', 'ginfo'],
        category: 'Group',
        description: 'Display information about the current group',
        usage: '{prefix}groupinfo',
        example: '{prefix}groupinfo',
        groupOnly: true,
        privateOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            // Check if command is used in a group
            if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
                return await ctx.reply('⚠️ This command can only be used in groups.');
            }

            // Get group information
            const chatId = ctx.chat.id.toString();
            const groupName = ctx.chat.title;
            const memberCount = await ctx.telegram.getChatMembersCount(ctx.chat.id);
            
            // Get group from database if exists
            const groupsTable = bot.DB.table('groups');
            const groupData = await groupsTable.get(chatId) || {};
            
            // Get group creation date or first seen date
            const creationDate = new Date(groupData.joinedAt || Date.now());
            const formattedDate = creationDate.toLocaleString();
            
            // Get group description if available
            let description = '';
            try {
                const chatInfo = await ctx.telegram.getChat(ctx.chat.id);
                description = chatInfo.description || 'No description set';
            } catch (error) {
                description = 'Unable to fetch description';
                console.error('Error fetching chat info:', error);
            }
            
            // Build response message
            let infoMessage = `📊 *Group Information*\n\n`;
            infoMessage += `📝 *Name:* ${groupName}\n`;
            infoMessage += `🆔 *ID:* \`${chatId}\`\n`;
            infoMessage += `👥 *Members:* ${memberCount}\n`;
            infoMessage += `📅 *First Seen:* ${formattedDate}\n`;
            infoMessage += `ℹ️ *Description:* ${description}\n`;
            
            // Add additional info if available
            if (groupData.settings) {
                infoMessage += `\n⚙️ *Settings:*\n`;
                
                if (groupData.settings.welcomeMessage) {
                    infoMessage += `- Welcome message: Enabled\n`;
                }
                
                if (groupData.settings.antiSpam) {
                    infoMessage += `- Anti-spam: Enabled\n`;
                }
            }
            
            // Send the message
            await ctx.replyWithMarkdown(infoMessage);
            
            // Update group info in database
            await groupsTable.set(chatId, {
                ...groupData,
                id: chatId,
                name: groupName,
                memberCount,
                type: ctx.chat.type,
                lastUpdated: Date.now()
            });
        } catch (error) {
            console.error('❌ Error in groupinfo command:', error);
            await ctx.reply('❌ An error occurred while fetching group information.');
        }
    }
};