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
    public collection: string;

    /**
     * Creates an instance of MongoBotStorage.
     * @param {any} db - The selected database
     * @param {IMongoBotStorageOptions} options
     */    
    constructor(public db: any, options?: IMongoBotStorageOptions) {
        const { collection="botdata" } = options || {};
        this.collection = collection;

        if (typeof collection !== 'string') {
            throw new Error('Invalid options value, "collection" must be of type string.');
        }
    }

    /**
     * Reads in data from storage.
     * @param {IBotStorageContext} context - Context object passed to IBotStorage calls.
     * @param {function} callback - Callback to pass the retrieved data to the caller.
     */
    public getData(context: IBotStorageContext, callback: (err: Error, data: IBotStorageData) => void): void {
        // List of write operations
        const readOps: IMongoReadOperation[] = [];
        const data: IBotStorageData = {};

        if (context.userId) {
            // Read userData
            if (context.persistUserData) {
                readOps.push(<IMongoReadOperation>{ 
                    id: context.userId,
                    key: 'userData'
                });
            }
            if (context.conversationId) {
                // Read privateConversationData
                readOps.push(<IMongoReadOperation>{ 
                    id: `${context.userId}:${context.conversationId}`,
                    key: 'privateConversationData'
                });
            }
        }
        if (context.persistConversationData && context.conversationId) {
            // Read conversationData
            readOps.push(<IMongoReadOperation>{ 
                id: context.conversationId,
                key: 'conversationData'
            });
        }

        // Execute all read ops
        const c = this.collection;
        Promise.all(readOps.map((op) => {
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
        }).catch(error => { 
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
        const writeOps: IMongoWriteOperation[] = [];        

        if (context.userId) {
            // Write userData
            if (context.persistUserData) {
                writeOps.push(<IMongoWriteOperation>{ 
                    id: context.userId, 
                    data: JSON.stringify(data.userData || {}),
                    type: 'userData',
                    lastModified: new Date().toISOString()
                });
            }
            if (context.conversationId) {
                // Write privateConversationData
                writeOps.push(<IMongoWriteOperation>{
                    id: `${context.userId}:${context.conversationId}`, 
                    data: JSON.stringify(data.privateConversationData || {}),
                    type: 'privateConversationData',
                    lastModified: new Date().toISOString()
                });
            }
        }
        if (context.persistConversationData && context.conversationId) {
            // Write conversationData
            writeOps.push(<IMongoWriteOperation>{
                id: context.conversationId, 
                data: JSON.stringify(data.conversationData || {}),
                type: 'conversationData',
                lastModified: new Date().toISOString()
            });
        }

        // Execute all write ops
        const c = this.collection;
        Promise.all(writeOps.map((op) => {
            return new Promise((resolve, reject) => {
                let filter = { _id: op.id };
                let update = {
                    _id: op.id, 
                    data: op.data,
                    type: op.type,
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
        }).catch(error => {
            callback(error) 
        });
    }
}