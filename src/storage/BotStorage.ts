import {
    IBotStorage,
    IBotStorageContext,
} from "botbuilder";
import { createHash } from "crypto";
import {
    BotState,
    BotStateType,
    IBotStorageDataHash,
    IBotStorageSettings,
    IReadOperation,
    IWriteOperation,
    ITTLSettings
} from "../types";
import { validateTTLSettings } from "../utils";




/**
 * 
 * @implements IBotStorage
 */
export class BotStorage implements IBotStorage {
    public ttl: ITTLSettings;

    public getDataFunction: any;
    public saveDataFunction: any;

    /**
     * Creates an instance of BotStorage.
     * @param {any} storageClient - The storageClient instance
     * @param {IBotStorageSettings} settings - The settings used to configure the bot's storage
     */
    constructor(storageClient: any, public settings: IBotStorageSettings) {
        // const { tableName, primaryKey, ttl } = settings || {} as IBotStorageSettings;

        // if (!storageClient || !tableName || !primaryKey) {
        //     throw new Error("Invalid constructor arguments for the BotStorage class.");
        // }
        const { ttl } = settings || {} as IBotStorageSettings;

        // if (!storageClient) {
        //     console.log("console Invalid constructor arguments for the BotStorage class. BotStorage")
        //     throw new Error("Invalid constructor arguments for the BotStorage class. ");
        // }

        if (ttl) {
            if (!validateTTLSettings(ttl)) {
                throw new Error("Invalid TTL settings.");
            } else {
                this.ttl = ttl;
            }
        }
    }

    /**
     * Reads in data from storage.
     * @param {IBotStorageContext} context - Context object passed to IBotStorage calls.
     * @param {function} callback - Callback to pass the retrieved data to the caller.
     */
    public getData(context: IBotStorageContext, callback: (err: Error, data: IBotStorageDataHash) => void): void {
        // List of write operations
        const readOps: IReadOperation[] = [];
        const data: IBotStorageDataHash = {};
        const {
            userId,
            conversationId,
            persistUserData,
            persistConversationData,
        } = context;

        if (userId) {
            // Read userData
            if (persistUserData) {
                readOps.push({
                    key: userId,
                    type: "userData",
                } as IReadOperation);
            }
            if (conversationId) {
                // Read privateConversationData
                readOps.push({
                    key: `${userId}:${conversationId}`,
                    type: "privateConversationData",
                } as IReadOperation);
            }
        }
        if (persistConversationData && conversationId) {
            // Read conversationData
            readOps.push({
                key: conversationId,
                type: "conversationData",
            } as IReadOperation);
        }

        // Execute all read ops
        // const { tableName, primaryKey } = this.settings;
        Promise.all(readOps.map((entry) => {
            return new Promise((resolve, reject) => {
                this.getDataFunction(data, entry, resolve, reject)
                //     const { key, type } = entry;
                //     const item = {
                //         TableName: tableName,
                //         Key: { [primaryKey]: { S: key } },
                //     };

                //     this.storageClient.getItem(item, (err: Error, doc: any) => {
                //         if (err) {
                //             return reject(err);
                //         }
                //         const docItem = doc && doc.Item || {};
                //         const dataString = docItem.data && docItem.data.S && JSON.parse(docItem.data.S) || {};
                //         const hashString = docItem.hash && docItem.hash.S;
                //         const hashKey: string = type + "Hash";

                //         data[type] = dataString;
                //         data[hashKey] = hashString;

                //         resolve();
                //     });
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
     * @param {IBotStorageDataHash} data - Object containing the data being persisted to storage.
     * @param {function} callback - Optional callback to pass errors to the caller.
     */
    public saveData(context: IBotStorageContext, data: IBotStorageDataHash, callback?: (err: Error) => void): void {
        // List of write operations
        const writeOps: IWriteOperation[] = [];
        const {
            userId,
            conversationId,
            persistUserData,
            persistConversationData,
        } = context;

        // Checks if a write operation is required by comparing hashes.
        // Only write to the database if the data has changed.
        let addWrite = (type: BotStateType, key: string, state: BotState, prevHash: string) => {
            state = JSON.stringify(state || {});
            const hash = createHash("sha256").update(state);
            const newHash = hash.digest("hex");

            if (newHash !== prevHash) {
                const writeOperation: IWriteOperation = {
                    key,
                    data: state,
                    hash: newHash,
                    type,
                    lastModified: new Date(),
                };
                if (this.ttl) {
                    // Compute and assign the desired expiration date/time
                    const timestamp = Date.now() + this.ttl[type] * 1000;
                    writeOperation.expireAt = new Date(timestamp);
                }
                writeOps.push(writeOperation);
            }
        };
        addWrite = addWrite.bind(this);

        if (userId) {
            // Write userData
            if (persistUserData) {
                addWrite("userData", userId, data.userData, data.userDataHash);
            }
            if (conversationId) {
                // Write privateConversationData
                const key = `${userId}:${conversationId}`;
                const { privateConversationData: d, privateConversationDataHash: h } = data;
                addWrite("privateConversationData", key, d, h);
            }
        }
        if (persistConversationData && conversationId) {
            // Write conversationData
            const { conversationData: d, conversationDataHash: h } = data;
            addWrite("conversationData", conversationId, d, h);
        }

        // Execute all write ops
        // const { tableName, primaryKey } = this.settings;
        Promise.all(writeOps.map((entry) => {
            return new Promise((resolve, reject) => {
                this.saveDataFunction(entry, resolve, reject)

                // const { key, data, hash, type, lastModified, expireAt } = entry;
                // const doc = {
                //     TableName: tableName,
                //     Item: {
                //         [primaryKey]: { S: key },
                //         data: { S: data },
                //         hash: { S: hash },
                //         type: { S: type },
                //         lastModified: { S: lastModified },
                //     } as any,
                // };
                // if (expireAt) {
                //     doc.Item.expireAt = { N: expireAt.toString() };
                // }

                // this.storageClient.putItem(doc, (err: Error) => {
                //     if (err) {
                //         return reject(err);
                //     }
                //     resolve();
                // });
            });
        })).then(() => {
            callback(null);
        }).catch((error) => {
            callback(error);
        });
    }
}
