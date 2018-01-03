import {
    IBotStorage,
    IBotStorageContext,
} from "botbuilder";
import { createHash } from "crypto";
import {
    BotState,
    BotStateType,
    IBotStorageDataHash,
    IRedisBotStorageSettings,
    IRedisReadOperation,
    IRedisWriteOperation,
    ITTLSettings,
} from "../types";
import { validateTTLSettings } from "../utils";

/**
 * The RedisBotStorage class caches the bot's state data in Redis
 * @implements IBotStorage
 */
export class RedisBotStorage implements IBotStorage {
    public ttl: ITTLSettings;

    /**
     * Creates an instance of RedisBotStorage.
     * @param {any} redisClient - The client instance connected to RedisBotStorage
     * @param {IRedisBotStorageSettings} settings - The settings used to configure the bot's storage
     */
    constructor(private redisClient: any, public settings?: IRedisBotStorageSettings) {
        const { ttl } = settings || {} as IRedisBotStorageSettings;

        if (!redisClient) {
            throw new Error("Invalid constructor arguments for the RedisBotStorage class.");
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
        const readOps: IRedisReadOperation[] = [];
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
                    key: `userData:user:${userId}`,
                    type: "userData",
                } as IRedisReadOperation);
            }
            if (conversationId) {
                // Read privateConversationData
                readOps.push({
                    key: `privateConversationData:user:${userId}:conversation:${conversationId}`,
                    type: "privateConversationData",
                } as IRedisReadOperation);
            }
        }
        if (persistConversationData && conversationId) {
            // Read conversationData
            readOps.push({
                key: `conversationData:conversation:${conversationId}`,
                type: "conversationData",
            } as IRedisReadOperation);
        }

        // Execute all read ops
        Promise.all(readOps.map((entry) => {
            return new Promise((resolve, reject) => {
                const { key, type } = entry;

                this.redisClient.get(key, (err: Error, res: any) => {
                    if (err) {
                        return reject(err);
                    }
                    res = res as string || "{}#";
                    const [obj, hash] = res.split("#");
                    const hashKey: string = type + "Hash";
                    data[type] = JSON.parse(obj);
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
     * @param {IBotStorageDataHash} data - Object containing the data being cached in Redis.
     * @param {function} callback - Optional callback to pass errors to the caller.
     */
    public saveData(context: IBotStorageContext, data: IBotStorageDataHash, callback?: (err: Error) => void): void {
        // List of write operations
        const writeOps: IRedisWriteOperation[] = [];
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
                const writeOperation: IRedisWriteOperation = {
                    key,
                    value: `${state}#${newHash}`,
                };
                if (this.ttl) {
                    // Assign the desired expiration date/time
                    writeOperation.expireAt = this.ttl[type];
                }
                writeOps.push(writeOperation);
            }
        };
        addWrite = addWrite.bind(this);

        if (userId) {
            // Write userData
            if (persistUserData) {
                const id = "userData";
                const key = `${id}:user:${userId}`;
                addWrite(id, key, data.userData, data.userDataHash);
            }
            if (conversationId) {
                // Write privateConversationData
                const id = "privateConversationData";
                const key = `${id}:user:${userId}:conversation:${conversationId}`;
                const { privateConversationData: d, privateConversationDataHash: h } = data;
                addWrite(id, key, d, h);
            }
        }
        if (persistConversationData && conversationId) {
            // Write conversationData
            const id = "conversationData";
            const key = `${id}:conversation:${conversationId}`;
            const { conversationData: d, conversationDataHash: h } = data;
            addWrite(id, key, d, h);
        }

        // Execute all write ops
        Promise.all(writeOps.map((entry) => {
            return new Promise((resolve, reject) => {
                const { key, value, expireAt } = entry;
                const callback = (err: Error) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                };
                const args = [key, value, callback];

                // If TTL is configured, add expire arguments
                if (expireAt) {
                    args.splice(2, 0, "EX", expireAt);
                }
                this.redisClient.set(...args);
            });
        })).then(() => {
            callback(null);
        }).catch((error) => {
            callback(error);
        });
    }
}
