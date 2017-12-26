export type BotStorageKey = "userData" | "conversationData" | "privateConversationData"

export interface IMongoBotStorageOptions {
    collection?: string;
    timestamp?: boolean;
}

export interface IMongoWriteOperation {
    _id: string;
    data: any;
}