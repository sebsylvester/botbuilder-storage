import {
    IBotStorage,
    IBotStorageContext,
} from "botbuilder";
import { createHash } from "crypto";
import {
    BotState,
    BotStateType,
    IBotStorageDataHash,
    IDynamoBotStorageSettings,
    IDynamoReadOperation,
    IDynamoWriteOperation,
    ITTLSettings,
} from "../types";
import { validateTTLSettings } from "../utils";

/**
 * The DynamoBotStorage class persists the bot's state data to Amazon DynamoDB
 * @implements IBotStorage
 */
export class DynamoBotStorage implements IBotStorage {
    public ttl: ITTLSettings;

    /**
     * Creates an instance of DynamoBotStorage.
     * @param {any} dynamoClient - The DynamoDB DocumentClient instance
     * @param {IDynamoBotStorageSettings} settings - The settings used to configure the bot's storage
     */
    constructor(private dynamoClient: any, public settings: IDynamoBotStorageSettings) {
        const { tableName, primaryKey, ttl } = settings || {} as IDynamoBotStorageSettings;

        if (!dynamoClient || !tableName || !primaryKey) {
            throw new Error("Invalid constructor arguments for the DynamoBotStorage class.");
        }

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
        const readOps: IDynamoReadOperation[] = [];
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
                } as IDynamoReadOperation);
            }
            if (conversationId) {
                // Read privateConversationData
                readOps.push({
                    key: `${userId}:${conversationId}`,
                    type: "privateConversationData",
                } as IDynamoReadOperation);
            }
        }
        if (persistConversationData && conversationId) {
            // Read conversationData
            readOps.push({
                key: conversationId,
                type: "conversationData",
            } as IDynamoReadOperation);
        }

        // Execute all read ops
        const { tableName, primaryKey } = this.settings;
        Promise.all(readOps.map((entry) => {
            return new Promise((resolve, reject) => {
                const { key, type } = entry;
                const item = {
                    TableName: tableName,
                    Key: { [primaryKey]: key },
                };

                this.dynamoClient.get(item, (err: Error, doc: any) => {
                    if (err) {
                        return reject(err);
                    }
                    const docData = doc && doc.Item && doc.Item.data || "{}";
                    const hash = doc && doc.Item && doc.Item.hash;
                    const hashKey: string = type + "Hash";

                    data[type] = JSON.parse(docData);
                    data[hashKey] = hash;

                    resolve();
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
     * @param {IBotStorageDataHash} data - Object containing the data being persisted to storage.
     * @param {function} callback - Optional callback to pass errors to the caller.
     */
    public saveData(context: IBotStorageContext, data: IBotStorageDataHash, callback?: (err: Error) => void): void {
        // List of write operations
        const writeOps: IDynamoWriteOperation[] = [];
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
                const writeOperation: IDynamoWriteOperation = {
                    key,
                    data: state,
                    hash: newHash,
                    type,
                    lastModified: new Date().toISOString(),
                };
                if (this.ttl) {
                    // Compute and assign the desired expiration date/time
                    const timestamp = Math.floor(Date.now() / 1000) + this.ttl[type];
                    writeOperation.expireAt = timestamp;
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
        const { tableName, primaryKey } = this.settings;
        Promise.all(writeOps.map((entry) => {
            return new Promise((resolve, reject) => {
                const { key, data, hash, type, lastModified, expireAt } = entry;
                const doc = {
                    TableName: tableName,
                    Item: { [primaryKey]: key, data, hash, type, lastModified } as any,
                };
                if (expireAt) {
                    doc.Item.expireAt = expireAt;
                }

                this.dynamoClient.put(doc, (err: Error) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        })).then(() => {
            callback(null);
        }).catch((error) => {
            callback(error);
        });
    }
}
