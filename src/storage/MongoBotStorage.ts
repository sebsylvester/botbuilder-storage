import { IBotStorage, IBotStorageContext, IBotStorageData } from "botbuilder"

/**
 * The MongoBotStorage class persists the bot's state data to MongoDB
 * @class
 */
export class MongoBotStorage implements IBotStorage {

    /**
     * Reads in data from storage.
     * @param {IBotStorageContext} context - Context object passed to IBotStorage calls.
     * @param {function} callback - Callback to pass the retrieved data to the caller.
     */
    public getData(context: IBotStorageContext, callback: (err: Error, data: IBotStorageData) => void) {
        var data: IBotStorageData = {};
        if (context.userId) {        
            if (context.persistUserData) {
                // Read userData
            }
            if (context.conversationId) {
                // Read privateConversationData
            }
        }
        if (context.persistConversationData && context.conversationId) {
            // Read conversationData
        }
    }
    
    /**
     * Writes out data to storage.
     * @param {IBotStorageContext} context - Context object passed to IBotStorage calls.
     * @param {IBotStorageData} data - Object containing the data being persisted to storage.
     * @param {function} callback - Optional callback to pass an eventual error to the caller.
     */
    public saveData(context: IBotStorageContext, data: IBotStorageData, callback?: (err: Error) => void) {
        if (context.userId) {            
            if (context.persistUserData) {
                // Write userData
            }
            if (context.conversationId) {
                // Write privateConversationData
            }
        }
        if (context.persistConversationData && context.conversationId) {
            // Write conversationData
        }
    }
}