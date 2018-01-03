import {
    IBotStorage,
    IBotStorageContext,
} from "botbuilder";
import { createHash } from "crypto";
import {
    BotState,
    BotStateType,
    IBotStorageDataHash,
    IMongoBotStorageSettings,
    IMongoReadOperation,
    IMongoWriteOperation,
    ITTLSettings,
} from "../types";
import { validateTTLSettings } from "../utils";

/**
 * The MongoBotStorage class persists the bot's state data to MongoDB
 * @implements IBotStorage
 */
export class MongoBotStorage implements IBotStorage {
    public ttl: ITTLSettings;

    /**
     * Creates an instance of MongoBotStorage.
     * @param {any} mongoClient - The client instance connected to MongoDB
     * @param {IMongoBotStorageSettings} settings - The settings used to configure the bot's storage
     */
    constructor(private mongoClient: any, public settings: IMongoBotStorageSettings) {
        const { collection, ttl } = settings || {} as IMongoBotStorageSettings;

        if (!mongoClient || !collection) {
            throw new Error("Invalid constructor arguments for the MongoBotStorage class.");
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
        const readOps: IMongoReadOperation[] = [];
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
                    _id: userId,
                    type: "userData",
                } as IMongoReadOperation);
            }
            if (conversationId) {
                // Read privateConversationData
                readOps.push({
                    _id: `${userId}:${conversationId}`,
                    type: "privateConversationData",
                } as IMongoReadOperation);
            }
        }
        if (persistConversationData && conversationId) {
            // Read conversationData
            readOps.push({
                _id: conversationId,
                type: "conversationData",
            } as IMongoReadOperation);
        }

        // Execute all read ops
        const db = this.mongoClient;
        const { collection: c } = this.settings;
        Promise.all(readOps.map((entry) => {
            return new Promise((resolve, reject) => {
                const { _id, type } = entry;
                db.collection(c).findOne({ _id }, (err: Error, doc: any) => {
                    if (err) {
                        return reject(err);
                    }
                    const docData = doc && doc.data || "{}";
                    const hash = doc && doc.hash;
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
        const writeOps: IMongoWriteOperation[] = [];
        const {
            userId,
            conversationId,
            persistUserData,
            persistConversationData,
        } = context;

        // Checks if a write operation is required by comparing hashes.
        // Only write to the database if the data has changed.
        let addWrite = (type: BotStateType, id: string, state: BotState, prevHash: string) => {
            state = JSON.stringify(state || {});
            const hash = createHash("sha256").update(state);
            const newHash = hash.digest("hex");

            if (newHash !== prevHash) {
                const writeOperation: IMongoWriteOperation = {
                    _id: id,
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
                const id = `${userId}:${conversationId}`;
                const { privateConversationData: d, privateConversationDataHash: h } = data;
                addWrite("privateConversationData", id, d, h);
            }
        }
        if (persistConversationData && conversationId) {
            // Write conversationData
            const { conversationData: d, conversationDataHash: h } = data;
            addWrite("conversationData", conversationId, d, h);
        }

        // Execute all write ops
        const db = this.mongoClient;
        const { collection } = this.settings;
        Promise.all(writeOps.map((entry) => {
            return new Promise((resolve, reject) => {
                const { _id, data, hash, type, lastModified, expireAt } = entry;
                const doc = { data, hash, type, lastModified } as any;
                if (expireAt) {
                    doc.expireAt = expireAt;
                }
                const options = { upsert: true };

                db.collection(collection).update({ _id }, doc, options, (err: Error) => {
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
