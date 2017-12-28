export type BotStorageKey = "userData" | "conversationData" | "privateConversationData"

/**
 * MongoDB related type declarations
 */
export interface IMongoBotStorageOptions {
    // The collection to persist the data to.
    // Defaults to "botdata".
    collection?: string;
}

export interface IMongoWriteOperation {
    id: string;
    data: any;
    type: BotStorageKey;
    lastModified: string;
}

export interface IMongoReadOperation {
    id: string;
    key: BotStorageKey;
}