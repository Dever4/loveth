/**
 * Contacts helper for Telegram bot
 */

/**
 * Save contacts to database
 * @param {Array} contacts - Array of contact objects from Telegram
 * @param {Object} bot - The bot instance
 */
const saveContacts = async (contacts, bot) => {
    try {
        for (const contact of contacts) {
            const userId = contact.id.toString();
            const contactExists = await bot.contactDB.has(userId);
            
            if (contactExists) {
                // Update existing contact
                const existingContact = await bot.contactDB.get(userId);
                await bot.contactDB.set(userId, {
                    ...existingContact,
                    name: contact.first_name,
                    username: contact.username || existingContact.username,
                    lastUpdated: Date.now()
                });
            } else {
                // Add new contact
                await bot.contactDB.set(userId, {
                    id: userId,
                    name: contact.first_name,
                    username: contact.username || null,
                    isBot: contact.is_bot || false,
                    firstSeen: Date.now(),
                    lastUpdated: Date.now()
                });
            }
        }
    } catch (error) {
        console.error('❌ Error saving contacts:', error);
    }
};

/**
 * Get contact by ID
 * @param {string} id - Contact ID
 * @param {Object} bot - The bot instance
 * @returns {Promise<Object|null>} - Contact object or null if not found
 */
const getContact = async (id, bot) => {
    try {
        return await bot.contactDB.get(id);
    } catch (error) {
        console.error(`❌ Error getting contact ${id}:`, error);
        return null;
    }
};

/**
 * Get all contacts
 * @param {Object} bot - The bot instance
 * @returns {Promise<Array>} - Array of contact objects
 */
const getAllContacts = async (bot) => {
    try {
        return await bot.contactDB.all();
    } catch (error) {
        console.error('❌ Error getting all contacts:', error);
        return [];
    }
};

module.exports = {
    saveContacts,
    getContact,
    getAllContacts
};