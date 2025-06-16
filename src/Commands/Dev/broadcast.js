/**
 * Broadcast command for sending messages to all users
 */

module.exports = {
    command: {
        name: 'broadcast',
        aliases: ['bcast', 'announce'],
        category: 'Dev',
        description: 'Send a message to all users or groups',
        usage: '{prefix}broadcast <message>',
        example: '{prefix}broadcast Important announcement: The bot will be down for maintenance tomorrow.',
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

            // Get the message to broadcast
            const message = args.join(' ');
            if (!message) {
                return await ctx.reply('⚠️ Please provide a message to broadcast.');
            }

            // Ask for confirmation
            const confirmationMsg = await ctx.reply(
                `⚠️ You are about to broadcast the following message to all users and groups:\n\n${message}\n\nReply with "confirm" to proceed or "cancel" to abort.`
            );

            // Set up a one-time listener for the confirmation
            const confirmationHandler = async (confirmCtx) => {
                // Check if it's a reply to our confirmation message and from the same user
                if (confirmCtx.message.reply_to_message && 
                    confirmCtx.message.reply_to_message.message_id === confirmationMsg.message_id &&
                    confirmCtx.from.id === ctx.from.id) {
                    
                    const response = confirmCtx.message.text.toLowerCase();
                    
                    // Remove the listener
                    bot.telegram.removeListener('message', confirmationHandler);
                    
                    if (response === 'confirm') {
                        // Proceed with broadcast
                        await ctx.reply('🚀 Broadcasting message...');
                        
                        // Format the broadcast message
                        const broadcastMessage = `📢 *ANNOUNCEMENT*\n\n${message}\n\n_Sent by admin_`;
                        
                        // Get all users and groups
                        const contactsTable = bot.DB.table('contacts');
                        const groupsTable = bot.DB.table('groups');
                        
                        const contacts = await contactsTable.all();
                        const groups = await groupsTable.all();
                        
                        let successCount = 0;
                        let failCount = 0;
                        
                        // Send to all users
                        for (const contact of contacts) {
                            try {
                                // Skip bots and the sender
                                if (contact.value.isBot || contact.id === userId) continue;
                                
                                await bot.telegram.sendMessage(contact.id, broadcastMessage, {
                                    parse_mode: 'Markdown'
                                });
                                successCount++;
                                
                                // Add a small delay to avoid rate limiting
                                await new Promise(resolve => setTimeout(resolve, 100));
                            } catch (error) {
                                console.error(`Failed to send broadcast to user ${contact.id}:`, error);
                                failCount++;
                            }
                        }
                        
                        // Send to all groups
                        for (const group of groups) {
                            try {
                                await bot.telegram.sendMessage(group.id, broadcastMessage, {
                                    parse_mode: 'Markdown'
                                });
                                successCount++;
                                
                                // Add a small delay to avoid rate limiting
                                await new Promise(resolve => setTimeout(resolve, 100));
                            } catch (error) {
                                console.error(`Failed to send broadcast to group ${group.id}:`, error);
                                failCount++;
                            }
                        }
                        
                        // Send summary
                        await ctx.reply(`✅ Broadcast complete!\n\nSuccessfully sent to: ${successCount}\nFailed: ${failCount}`);
                    } else {
                        // Cancel broadcast
                        await ctx.reply('❌ Broadcast cancelled.');
                    }
                }
            };
            
            // Add the listener
            bot.telegram.on('message', confirmationHandler);
            
            // Set a timeout to remove the listener after 2 minutes
            setTimeout(() => {
                bot.telegram.removeListener('message', confirmationHandler);
                ctx.reply('⏱️ Broadcast confirmation timed out.').catch(console.error);
            }, 2 * 60 * 1000);
        } catch (error) {
            console.error('❌ Error in broadcast command:', error);
            await ctx.reply('❌ An error occurred while executing the broadcast command.');
        }
    }
};