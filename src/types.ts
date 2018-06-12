import { IBotStorageData } from "botbuilder";

export type BotState = any;
export type BotStateType = "userData" | "conversationData" | "privateConversationData";

export interface IBotStorageDataHash extends IBotStorageData {
    userDataHash?: string;
    conversationDataHash?: string;
    privateConversationDataHash?: string;
    [key: string]: any;
}

export interface ITTLSettings {
    userData: number;
    conversationData: number;
    privateConversationData: number;
}
export interface IWriteOperation {
    key: string;
    data: string;
    hash: string;
    type: BotStateType;
    lastModified: Date;
    expireAt?: Date;
}

export interface IReadOperation {
    type: BotStateType;
}
export interface IBotStorageSettings {
    ttl?: ITTLSettings;
}

export interface IFirebaseWriteOperation extends IWriteOperation {
}
export interface IFirebaseReadOperation extends IReadOperation {
}
export interface IFirebaseBotStorageSettings extends IBotStorageSettings {
    refName: string;
}

export interface IMongoWriteOperation {
    _id: string;
    data: string;
    hash: string;
    type: BotStateType;
    lastModified: Date;
    expireAt?: Date;
}

export interface IMongoReadOperation {
    _id: string;
    type: BotStateType;
}

export interface IMongoBotStorageSettings {
    collection: string;
    ttl?: ITTLSettings;
}

export interface IDynamoWriteOperation {
    key: string;
    data: string;
    hash: string;
    type: BotStateType;
    lastModified: string;
    expireAt?: number;
}

export interface IDynamoReadOperation {
    key: string;
    type: BotStateType;
}

export interface IDynamoBotStorageSettings {
    tableName: string;
    primaryKey: string;
    ttl?: ITTLSettings;
}

export interface IRedisWriteOperation {
    key: string;
    value: any;
    expireAt?: number;
}

export interface IRedisReadOperation {
    key: string;
    type: BotStateType;
}

export interface IRedisBotStorageSettings {
    ttl?: ITTLSettings;
}
