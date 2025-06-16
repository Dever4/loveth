/**
 * Eval command for executing JavaScript code
 * SECURITY WARNING: This command should only be used by trusted moderators
 */

module.exports = {
    command: {
        name: 'eval',
        aliases: ['execute', 'run'],
        category: 'Dev',
        description: 'Evaluates JavaScript code',
        usage: '{prefix}eval <code>',
        example: '{prefix}eval bot.cmd.size',
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

            // Get the code to evaluate
            const code = args.join(' ');
            if (!code) {
                return await ctx.reply('⚠️ Please provide code to evaluate.');
            }

            // Log the eval attempt for security
            console.log(`⚠️ Eval command used by ${ctx.from.username || ctx.from.first_name} (${userId}): ${code}`);

            // Evaluate the code
            let result;
            try {
                // Use Function constructor to create a function with all the available context
                const evalFunction = new Function('ctx', 'bot', 'args', `
                    try {
                        return ${code};
                    } catch (error) {
                        return { error: error.message };
                    }
                `);
                
                result = await evalFunction(ctx, bot, args);
            } catch (evalError) {
                result = { error: evalError.message };
            }

            // Format the result
            let response;
            if (result && result.error) {
                response = `❌ Error: ${result.error}`;
            } else {
                response = `✅ Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
            }

            // Send the result
            await ctx.reply(response, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('❌ Error in eval command:', error);
            await ctx.reply(`❌ An error occurred: ${error.message}`);
        }
    }
};