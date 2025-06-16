/**
 * SQLite Database Module
 *
 * This module provides a wrapper around sqlite3 and sqlite for database operations.
 * It replaces the QuickDB implementation with a direct SQLite implementation.
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

class Database {
    constructor() {
        this.db = null;
        this.tables = new Map();
    }

    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Use DB_PATH from environment variables or default to './telegram-database.db'
            const dbPath = process.env.TELEGRAM_DB_PATH || './telegram-database.db';

            this.db = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });

            console.log(`✅ SQLite database connected successfully at ${dbPath}`);

            // Create tables if they don't exist
            await this.createTables();

            // Check and migrate database if needed
            await this.checkAndMigrateDatabase();
        } catch (error) {
            console.error('❌ Error connecting to SQLite database:', error);
            throw error;
        }
    }

    /**
     * Check if database needs migration and perform it if necessary
     * @returns {Promise<void>}
     */
    async checkAndMigrateDatabase() {
        try {
            // Check if tables exist by trying to query them
            const tables = [
                'lastActivity',
                'conversationContext',
                'groupJoined',
                'doneUsers',
                'userResponseStage'
            ];

            for (const tableName of tables) {
                try {
                    // Try to query the table
                    await this.db.get(`SELECT 1 FROM ${tableName} LIMIT 1`);
                    console.log(`✅ Table ${tableName} exists`);
                } catch (tableError) {
                    // If table doesn't exist, create it
                    if (tableError.message.includes('no such table')) {
                        console.log(`⚠️ Table ${tableName} doesn't exist, creating it...`);
                        await this.db.exec(`
                            CREATE TABLE IF NOT EXISTS ${tableName} (
                                ID TEXT PRIMARY KEY,
                                json TEXT
                            )
                        `);
                        console.log(`✅ Table ${tableName} created successfully`);
                    } else {
                        throw tableError;
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking and migrating database:', error);
            throw error;
        }
    }

    /**
     * Create necessary tables if they don't exist
     * @returns {Promise<void>}
     */
    async createTables() {
        // Create a table for storing key-value pairs
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS json (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for config data
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS config (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for contacts
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for chat sessions
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS chatSessions (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for tracking last activity
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS lastActivity (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for tracking conversation context
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS conversationContext (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for tracking group joined status
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS groupJoined (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for tracking users who have said DONE
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS doneUsers (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);

        // Create a table for tracking user response stages
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS userResponseStage (
                ID TEXT PRIMARY KEY,
                json TEXT
            )
        `);
    }

    /**
     * Get a table instance
     * @param {string} tableName - The name of the table
     * @returns {Table} - A Table instance for the specified table
     */
    table(tableName) {
        if (!this.tables.has(tableName)) {
            this.tables.set(tableName, new Table(this.db, tableName));
        }
        return this.tables.get(tableName);
    }

    /**
     * Close the database connection
     * @returns {Promise<void>}
     */
    async close() {
        if (this.db) {
            await this.db.close();
            console.log('✅ SQLite database connection closed');
        }
    }
}

class Table {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
        this.init();
    }

    /**
     * Initialize the table
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Create the table if it doesn't exist
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                    ID TEXT PRIMARY KEY,
                    json TEXT
                )
            `);
            console.log(`✅ Table ${this.tableName} initialized`);
        } catch (error) {
            console.error(`❌ Error initializing table ${this.tableName}:`, error);
            // Don't throw the error, just log it and continue
            // This allows the application to continue even if there's an issue with one table
        }
    }

    /**
     * Get a value from the table
     * @param {string} key - The key to get
     * @returns {Promise<any>} - The value associated with the key
     */
    async get(key) {
        try {
            // First check if the table exists
            try {
                await this.db.get(`SELECT 1 FROM ${this.tableName} LIMIT 1`);
            } catch (tableError) {
                // If table doesn't exist, create it
                if (tableError.message.includes('no such table')) {
                    console.log(`⚠️ Table ${this.tableName} doesn't exist when trying to get ${key}, creating it...`);
                    await this.init();
                    return null; // Return null since the table was just created
                }
            }

            // Now get the value
            const row = await this.db.get(
                `SELECT json FROM ${this.tableName} WHERE ID = ?`,
                key
            );
            return row ? JSON.parse(row.json) : null;
        } catch (error) {
            console.error(`❌ Error getting value for key ${key} from table ${this.tableName}:`, error);
            return null;
        }
    }

    /**
     * Set a value in the table
     * @param {string} key - The key to set
     * @param {any} value - The value to set
     * @returns {Promise<any>} - The value that was set
     */
    async set(key, value) {
        try {
            // First check if the table exists
            try {
                await this.db.get(`SELECT 1 FROM ${this.tableName} LIMIT 1`);
            } catch (tableError) {
                // If table doesn't exist, create it
                if (tableError.message.includes('no such table')) {
                    console.log(`⚠️ Table ${this.tableName} doesn't exist when trying to set ${key}, creating it...`);
                    await this.init();
                }
            }

            const jsonValue = JSON.stringify(value);
            await this.db.run(
                `INSERT OR REPLACE INTO ${this.tableName} (ID, json) VALUES (?, ?)`,
                key,
                jsonValue
            );
            return value;
        } catch (error) {
            console.error(`❌ Error setting value for key ${key} in table ${this.tableName}:`, error);
            // Don't throw the error, just log it and return the value
            // This allows the application to continue even if there's an issue with one table
            return value;
        }
    }

    /**
     * Check if a key exists in the table
     * @param {string} key - The key to check
     * @returns {Promise<boolean>} - Whether the key exists
     */
    async has(key) {
        try {
            const row = await this.db.get(
                `SELECT 1 FROM ${this.tableName} WHERE ID = ?`,
                key
            );
            return !!row;
        } catch (error) {
            console.error(`❌ Error checking if key ${key} exists in table ${this.tableName}:`, error);
            return false;
        }
    }

    /**
     * Delete a key from the table
     * @param {string} key - The key to delete
     * @returns {Promise<number>} - The number of rows affected
     */
    async delete(key) {
        try {
            const result = await this.db.run(
                `DELETE FROM ${this.tableName} WHERE ID = ?`,
                key
            );
            return result.changes;
        } catch (error) {
            console.error(`❌ Error deleting key ${key} from table ${this.tableName}:`, error);
            return 0;
        }
    }

    /**
     * Delete all keys from the table
     * @returns {Promise<number>} - The number of rows affected
     */
    async deleteAll() {
        try {
            const result = await this.db.run(`DELETE FROM ${this.tableName}`);
            return result.changes;
        } catch (error) {
            console.error(`❌ Error deleting all keys from table ${this.tableName}:`, error);
            return 0;
        }
    }

    /**
     * Get all key-value pairs from the table
     * @returns {Promise<Array<{id: string, value: any}>>} - All key-value pairs
     */
    async all() {
        try {
            const rows = await this.db.all(`SELECT ID, json FROM ${this.tableName}`);
            return rows.map(row => ({
                id: row.ID,
                value: JSON.parse(row.json)
            }));
        } catch (error) {
            console.error(`❌ Error getting all values from table ${this.tableName}:`, error);
            return [];
        }
    }
}

module.exports = { Database };