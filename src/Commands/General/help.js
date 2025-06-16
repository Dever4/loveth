/**
 * Help command for Telegram bot
 */

module.exports = {
    command: {
        name: 'help',
        aliases: ['menu', 'commands'],
        category: 'General',
        description: 'Displays the list of commands or info about a specific command',
        usage: '{prefix}help [command]',
        example: '{prefix}help ping',
        groupOnly: false,
        privateOnly: false,
        modsOnly: false
    },
    execute: async (ctx, args, bot) => {
        try {
            const prefix = bot.config.prefix;
            
            // If a command name is provided, show info about that command
            if (args.length > 0) {
                const commandName = args[0].toLowerCase();
                const command = bot.cmd.get(commandName);
                
                if (!command) {
                    return await ctx.reply(`⚠️ Command "${commandName}" not found.`);
                }
                
                const commandInfo = command.command;
                
                let helpText = `📖 *Command: ${prefix}${commandInfo.name}*\n\n`;
                helpText += `📝 *Description:* ${commandInfo.description}\n`;
                helpText += `🔧 *Usage:* ${commandInfo.usage.replace('{prefix}', prefix)}\n`;
                
                if (commandInfo.aliases && commandInfo.aliases.length > 0) {
                    helpText += `🔄 *Aliases:* ${commandInfo.aliases.map(a => `${prefix}${a}`).join(', ')}\n`;
                }
                
                helpText += `📋 *Example:* ${commandInfo.example.replace('{prefix}', prefix)}\n`;
                
                if (commandInfo.groupOnly) {
                    helpText += `⚠️ This command can only be used in groups.\n`;
                }
                
                if (commandInfo.privateOnly) {
                    helpText += `⚠️ This command can only be used in private chats.\n`;
                }
                
                if (commandInfo.modsOnly) {
                    helpText += `⚠️ This command can only be used by moderators.\n`;
                }
                
                return await ctx.replyWithMarkdown(helpText);
            }
            
            // Otherwise, show the list of commands grouped by category
            const categories = new Map();
            
            bot.cmd.forEach(cmd => {
                const category = cmd.command.category || 'Uncategorized';
                
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                
                categories.get(category).push(cmd.command);
            });
            
            let helpText = `📚 *${bot.config.name} Command List*\n\n`;
            helpText += `Use \`${prefix}help [command]\` to view detailed information about a specific command.\n\n`;
            
            for (const [category, commands] of categories) {
                helpText += `*${category}*\n`;
                
                for (const command of commands) {
                    helpText += `• \`${prefix}${command.name}\` - ${command.description}\n`;
                }
                
                helpText += '\n';
            }
            
            helpText += `Total commands: ${bot.cmd.size}`;
            
            await ctx.replyWithMarkdown(helpText);
        } catch (error) {
            console.error('❌ Error in help command:', error);
            await ctx.reply('❌ An error occurred while executing this command.');
        }
    }
};