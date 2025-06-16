require('dotenv').config()

module.exports.getConfig = () => {
    return {
        name: process.env.TELEGRAM_BOT_NAME || 'TelegramBot',
        prefix: process.env.TELEGRAM_PREFIX || '/',
        writesonicAPI: process.env.WRITE_SONIC || null,
        bgAPI: process.env.BG_API_KEY || null,
        mods: (process.env.TELEGRAM_MODS || '').split(','),
        telegramToken: process.env.TELEGRAM_BOT_TOKEN || ''
    }
}