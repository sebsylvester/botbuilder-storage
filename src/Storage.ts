import { IBotStorage, IBotStorageContext, IBotStorageData } from "botbuilder"

export class Storage implements IBotStorage {
    public getData(context: IBotStorageContext, callback: (err: Error, data: IBotStorageData) => void) {}
    public saveData(context: IBotStorageContext, data: IBotStorageData, callback?: (err: Error) => void) {}
}