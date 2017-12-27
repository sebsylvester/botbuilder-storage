import { 
    IBotStorage, 
    IBotStorageContext, 
    IBotStorageData 
} from "botbuilder";
import { 
    BotStorageKey, 
    IMongoBotStorageOptions,
    IMongoReadOperation,
    IMongoWriteOperation
} from '../types';

/**
 * The MongoBotStorage class persists the bot's state data to MongoDB
 * @implements IBotStorage
 */
export class MongoBotStorage implements IBotStorage {
    private collection: string;
    private userStore: { [id: string]: string; } = {};
    private conversationStore: { [id: string]: string; } = {};

    /**
     * Creates an instance of MongoBotStorage.
     * @param {any} db - The selected database
     * @param {IMongoBotStorageOptions} options
     */    
    constructor(public db: any, options?: IMongoBotStorageOptions) {
        const { collection="botdata" } = options || {};
        this.collection = collection;
    }

    /**
     * Reads in data from storage.
     * @param {IBotStorageContext} context - Context object passed to IBotStorage calls.
     * @param {function} callback - Callback to pass the retrieved data to the caller.
     */
    public getData(context: IBotStorageContext, callback: (err: Error, data: IBotStorageData) => void): void {
        // List of write operations
        const operations: IMongoReadOperation[] = [];
        const data: IBotStorageData = {};

        if (context.userId) {
            // Read userData
            if (context.persistUserData) {
                operations.push(<IMongoReadOperation>{ 
                    id: context.userId,
                    key: 'userData'
                });
            }
            if (context.conversationId) {
                // Read privateConversationData
                let id = `${context.userId}:${context.conversationId}`;
                operations.push(<IMongoReadOperation>{ 
                    id: id,
                    key: 'privateConversationData'
                });
            }
        }
        if (context.persistConversationData && context.conversationId) {
            // Read conversationData
            operations.push(<IMongoReadOperation>{ 
                id: context.conversationId,
                key: 'conversationData'
            });
        }

        // Execute all read ops
        const c = this.collection;
        Promise.all(operations.map((op) => {
            return new Promise((resolve, reject) => {
                this.db.collection(c).findOne({ _id: op.id }, (err: Error, doc: any) => {
                    if (err) {
                        return reject(err);
                    }
                    let docData = doc && doc.data || '{}';
                    data[op.key] = JSON.parse(docData);
                    resolve(doc);
                });
            });
        })).then(() => {
            callback(null, data);
        }).catch((error) => { 
            callback(error, {});
        });
        
    }

    /**
     * Writes out data to storage.
     * @param {IBotStorageContext} context - Context object passed to IBotStorage calls.
     * @param {IBotStorageData} data - Object containing the data being persisted to storage.
     * @param {function} callback - Optional callback to pass errors to the caller.
     */
    public saveData(context: IBotStorageContext, data: IBotStorageData, callback?: (err: Error) => void): void {
        // List of write operations
        const operations: IMongoWriteOperation[] = [];

        if (context.userId) {
            // Write userData
            if (context.persistUserData) {
                operations.push(<IMongoWriteOperation>{ 
                    id: context.userId, 
                    data: JSON.stringify(data.userData || {}),
                    lastModified: new Date().toISOString()
                });
            }
            if (context.conversationId) {
                // Write privateConversationData
                let id = `${context.userId}:${context.conversationId}`;
                operations.push(<IMongoWriteOperation>{
                    id: id, 
                    data: JSON.stringify(data.privateConversationData || {}),
                    lastModified: new Date().toISOString()
                });
            }
        }
        if (context.persistConversationData && context.conversationId) {
            // Write conversationData
            operations.push(<IMongoWriteOperation>{
                id: context.conversationId, 
                data: JSON.stringify(data.conversationData || {}),
                lastModified: new Date().toISOString()
            });
        }

        // Execute all write ops
        const c = this.collection;
        Promise.all(operations.map((op) => {
            return new Promise((resolve, reject) => {
                let filter = { _id: op.id };
                let update = {
                    _id: op.id, 
                    data: op.data,
                    lastModified: op.lastModified
                };

                let options = { upsert: true };
                this.db.collection(c).update(filter, update, options, (err: Error, res: any) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                });
            });
        })).then(() => {
            callback(null) 
        }).catch((error) => {
            callback(error) 
        });
    }
}