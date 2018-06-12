
import { BotStorage } from "./BotStorage";
import {
    IBotStorageDataHash,
    IFirebaseBotStorageSettings,
} from "../types";

export class FireBaseBotStorage extends BotStorage {

    constructor(storageClient: any, public settings: IFirebaseBotStorageSettings) {
        super(storageClient, settings)
        const { refName } = settings || {} as IFirebaseBotStorageSettings;
        if (!storageClient || (typeof (refName) === "undefined")) {
            throw new Error("Invalid constructor arguments for the FireBaseBotStorage class. FireBaseBotStorage");
        }
        this.getDataFunction = (data: IBotStorageDataHash, entry: any, resolve: any, reject: any) => {
            storageClient.orderByChild("key").equalTo(entry.key).once("value", (snapshot: any) => {
                console.log("snapshot.hasChildren", snapshot.hasChildren())

                snapshot.forEach((d: any) => {
                    // console.log("data", data)
                    let item = d.val()
                    let type = JSON.parse(item.state);

                    data[type] = JSON.parse(item.state);
                    const hashKey: string = type + "Hash";
                    const hashString = item.hash && item.hash.S;
                    data[hashKey] = hashString;
                });
                resolve();
                reject();
            });
        }
        this.saveDataFunction = (entry: any, resolve: any, reject: any) => {
            const { key, data, hash, type, lastModified, expireAt } = entry;

            storageClient.orderByChild("key").equalTo(entry.key).once("value", (snapshot: any) => {

                if (!snapshot.hasChildren()) {
                    storageClient.push().set({
                        state: JSON.stringify({
                            data,
                            hash,
                            type,
                            lastModified,
                            expireAt
                        }),
                        key
                    }, (error: any) => {
                        if (error) {
                            console.log("Data could not be saved." + error);
                            reject();
                        } else {
                            console.log("Data saved successfully.");
                            resolve();
                        }
                    });

                } else {
                    console.log("Data already saved successfully.");
                    snapshot.update({
                        state: JSON.stringify({
                            data,
                            hash,
                            type,
                            lastModified,
                            expireAt
                        })
                    }, (error: any) => {
                        if (error) {
                            console.log("Data could not be saved." + error);
                            reject();
                        } else {
                            console.log("Data saved successfully.");
                            resolve();
                        }
                    });

                }
            })
        }
    }
}


