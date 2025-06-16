/**
 * Handles group updates (members joining or leaving)
 * @param {object} ctx - The Telegram context object
 * @param {object} bot - The Telegram bot instance
 * @param {string} action - The action type ('add' or 'remove')
 */
const GroupUpdateHandler = async (ctx, bot, action) => {
    try {
        const chatId = ctx.chat.id.toString();
        const groupName = ctx.chat.title;
        
        // Store group in database if not already stored
        const groupsTable = bot.DB.table('groups');
        const groupExists = await groupsTable.has(chatId);
        
        if (!groupExists) {
            await groupsTable.set(chatId, {
                id: chatId,
                name: groupName,
                type: ctx.chat.type,
                joinedAt: Date.now()
            });
            console.log(`✅ Added new group to database: ${groupName} (${chatId})`);
        }
        
        if (action === 'add') {
            // Handle new members
            const newMembers = ctx.message.new_chat_members;
            
            for (const member of newMembers) {
                // Skip if the new member is the bot itself
                if (member.id === ctx.botInfo.id) {
                    console.log(`🤖 Bot was added to group: ${groupName} (${chatId})`);
                    
                    // Send welcome message as the bot
                    await ctx.reply(`👋 Hello everyone! I'm ${ctx.botInfo.first_name}, your financial training assistant. Use /${bot.config.prefix}help to see what I can do!`);
                    continue;
                }
                
                const memberName = member.first_name;
                const memberId = member.id.toString();
                
                // Add user to contacts if not exists
                const userExists = await bot.contactDB.has(memberId);
                
                if (!userExists) {
                    await bot.contactDB.set(memberId, {
                        id: memberId,
                        name: memberName,
                        username: member.username || null,
                        isBot: member.is_bot,
                        lastSeen: Date.now()
                    });
                    console.log(`✅ Added new user to contacts from group join: ${memberName} (${memberId})`);
                }
                
                // Get welcome message from config or use default
                const configTable = bot.DB.table('config');
                const welcomeMessage = await configTable.get('groupWelcomeMessage') || 
                    `👋 Welcome to ${groupName}, ${memberName}! This is a financial training group where you can learn how to make money online. Feel free to introduce yourself!`;
                
                // Send welcome message
                await ctx.reply(welcomeMessage);
            }
        } else if (action === 'remove') {
            // Handle members leaving
            const leftMember = ctx.message.left_chat_member;
            
            // Skip if the left member is the bot itself
            if (leftMember.id === ctx.botInfo.id) {
                console.log(`🤖 Bot was removed from group: ${groupName} (${chatId})`);
                
                // Update group status in database
                await groupsTable.set(chatId, {
                    id: chatId,
                    name: groupName,
                    type: ctx.chat.type,
                    leftAt: Date.now(),
                    active: false
                });
                
                return;
            }
            
            const memberName = leftMember.first_name;
            const memberId = leftMember.id.toString();
            
            // Get goodbye message from config or use default
            const configTable = bot.DB.table('config');
            const showGoodbyeMessage = await configTable.get('showGroupGoodbyeMessage') || true;
            
            if (showGoodbyeMessage) {
                const goodbyeMessage = await configTable.get('groupGoodbyeMessage') || 
                    `👋 ${memberName} has left the group. We hope to see you again soon!`;
                
                // Send goodbye message
                await ctx.reply(goodbyeMessage);
            }
        }
    } catch (error) {
        console.error('❌ Error in GroupUpdateHandler:', error);
    }
};

module.exports = GroupUpdateHandler;