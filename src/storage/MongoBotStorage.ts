import { 
    IBotStorage, 
    IBotStorageContext
} from "botbuilder";
import { createHash } from 'crypto';
import { 
    StorageType,
    IBotHashedStorageData,
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
    public getData(context: IBotStorageContext, callback: (err: Error, data: IBotHashedStorageData) => void): void {
        // List of write operations
        const readOps: IMongoReadOperation[] = [];
        const data: IBotHashedStorageData = {};
        const { 
            userId, 
            conversationId, 
            persistUserData, 
            persistConversationData 
        } = context;

        if (userId) {
            // Read userData
            if (persistUserData) {
                readOps.push(<IMongoReadOperation>{ 
                    _id: userId,
                    type: 'userData'
                });
            }
            if (conversationId) {
                // Read privateConversationData
                readOps.push(<IMongoReadOperation>{ 
                    _id: `${userId}:${conversationId}`,
                    type: 'privateConversationData'
                });
            }
        }
        if (persistConversationData && conversationId) {
            // Read conversationData
            readOps.push(<IMongoReadOperation>{ 
                _id: conversationId,
                type: 'conversationData'
            });
        }

        // Execute all read ops
        const c = this.collection;
        Promise.all(readOps.map(entry => {
            return new Promise((resolve, reject) => {
                const { _id, type } = entry;
                
                this.db.collection(c).findOne({ _id }, (err: Error, doc: any) => {
                    if (err) {
                        return reject(err);
                    }
                    const docData = doc && doc.data || '{}';
                    const hash = doc && doc.hash;
                    const hashKey: string = type + 'Hash';

                    data[type] = JSON.parse(docData);
                    data[hashKey] = hash;
                    
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
     * @param {IBotHashedStorageData} data - Object containing the data being persisted to storage.
     * @param {function} callback - Optional callback to pass errors to the caller.
     */
    public saveData(context: IBotStorageContext, data: IBotHashedStorageData, callback?: (err: Error) => void): void {
        // List of write operations
        const writeOps: IMongoWriteOperation[] = [];
        const { 
            userId, 
            conversationId, 
            persistUserData, 
            persistConversationData 
        } = context;
        
        // Checks if a write operation is required by comparing hashes.
        // Only write to the database if the data has changed.
        function addWrite(type: StorageType, id: string, data: any, prevHash: string) {
            const _data = JSON.stringify(data || {});
            const hash = createHash('sha256').update(_data);
            const newHash = hash.digest('hex');

            if (newHash !== prevHash) {
                writeOps.push(<IMongoWriteOperation>{
                    _id: id,
                    data: _data,
                    hash: newHash,
                    type: type,
                    lastModified: new Date().toISOString()
                });
            }
        }

        if (userId) {
            // Write userData
            if (persistUserData) {
                addWrite('userData', userId, data.userData, data.userDataHash);
            }
            if (conversationId) {
                // Write privateConversationData
                const id = `${userId}:${conversationId}`;
                const { privateConversationData: d, privateConversationDataHash: h } = data;
                addWrite('privateConversationData', id, d, h);
            }
        }
        if (persistConversationData && conversationId) {
            // Write conversationData
            const { conversationData: d, conversationDataHash: h } = data;
            addWrite('conversationData', conversationId, d, h);
        }

        // Execute all write ops
        const c = this.collection;
        Promise.all(writeOps.map(entry => {
            return new Promise((resolve, reject) => {
                const { _id, data, hash, type, lastModified } = entry;
                const doc = { data, hash, type, lastModified }
                const options = { upsert: true };

                this.db.collection(c).update({ _id }, doc, options, (err: Error, res: any) => {
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