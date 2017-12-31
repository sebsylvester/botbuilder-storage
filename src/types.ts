import { IBotStorageData } from "botbuilder";

export type BotState = "userData" | "conversationData" | "privateConversationData";

export interface IBotHashedStorageData extends IBotStorageData {
    userDataHash?: string;
    conversationDataHash?: string;
    privateConversationDataHash?: string;
    [key: string]: any;
}

export interface IMongoWriteOperation {
    _id: string;
    data: any;
    hash: string;
    type: BotState;
    lastModified: string;
}

export interface IMongoReadOperation {
    _id: string;
    type: BotState;
}

export interface IDynamoWriteOperation {
    key: string;
    data: any;
    hash: string;
    type: BotState;
    lastModified: string;
}

export interface IDynamoReadOperation {
    key: string;
    type: BotState;
}

export interface IRedisWriteOperation {
    key: string;
    value: any;
}

export interface IRedisReadOperation {
    key: string;
    type: BotState;
}
