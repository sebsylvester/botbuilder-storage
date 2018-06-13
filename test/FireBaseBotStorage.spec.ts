import { IBotStorageContext } from "botbuilder";
import { expect } from "chai";
import { IBotStorageDataHash, IFirebaseBotStorageSettings, ITTLSettings } from "../lib/types";
const { FireBaseBotStorage } = require("../lib/storage/FireBaseBotStorage");


describe("FireBaseBotStorage", () => {
    describe("constructor", () => {
        const errorMessage = "Invalid constructor arguments for the FireBaseBotStorage class.";

        it("should set the refName value on the settings property", () => {
            const botStorage = new FireBaseBotStorage({}, { refName: "Botdata" });
            expect(botStorage.settings.refName).to.equal("Botdata");
        });

        it("should set the ttl property with valid settings", () => {
            const ttl: ITTLSettings = {
                userData: Date.now() + 3600 * 1000 * 24,
                conversationData: Date.now() + 3600 * 1000 * 24,
                privateConversationData: Date.now() + 3600 * 1000 * 24,
            };
            const botStorage = new FireBaseBotStorage({}, {
                refName: "botstate",
                ttl,
            } as IFirebaseBotStorageSettings);
            expect(botStorage.ttl).to.deep.equal(ttl);
        });

        it("should throw an error when invoked without a database client", () => {
            function throwsException() {
                const botStorage = new FireBaseBotStorage();
            }
            expect(throwsException).to.throw(errorMessage);
        });

        it("should throw an error when invoked with invalid settings values (1)", () => {
            function throwsException() {
                const botStorage = new FireBaseBotStorage({}, {});
            }
            expect(throwsException).to.throw(errorMessage);
        });

        it("should throw an error when invoked with invalid settings values (2)", () => {
            function throwsException() {
                const botStorage = new FireBaseBotStorage({}, {
                    tableName: "botstate",
                    primaryKey: "id",
                    ttl: {},
                });
            }
            expect(throwsException).to.throw("Invalid TTL settings.");
        });
    });

    // describe("getData", () => {
    //     const doc = {
    //         Item: {
    //             data: { S: "" },
    //             hash: { S: "" },
    //         } as any,
    //     };
    //     const data = {
    //         Item: {
    //             userData: { state: "user specific" },
    //             userDataHash: "__userDataHash__",
    //             conversationData: { state: "public" },
    //             conversationDataHash: "__conversationDataHash__",
    //             privateConversationData: { state: "private" },
    //             privateConversationDataHash: "__privateConversationDataHash__",
    //         },
    //     };
    //     const settings = { tableName: "botdata", primaryKey: "id" };

    //     // Mock of DynamoDB client
    //     const dynamoClient = {
    //         getItem(item, callback) {
    //             const primaryKeyObject = item.Key[settings.primaryKey];
    //             const primaryKeyValue = primaryKeyObject && primaryKeyObject.S;

    //             switch (primaryKeyValue) {
    //                 case "default-user":
    //                     doc.Item.data.S = JSON.stringify(data.Item.userData);
    //                     doc.Item.hash.S = data.Item.userDataHash;
    //                     break;
    //                 case "default-user:123456789":
    //                     doc.Item.data.S = JSON.stringify(data.Item.privateConversationData);
    //                     doc.Item.hash.S = data.Item.privateConversationDataHash;
    //                     break;
    //                 case "123456789":
    //                     doc.Item.data.S = JSON.stringify(data.Item.conversationData);
    //                     doc.Item.hash.S = data.Item.conversationDataHash;
    //                     break;
    //                 case "null":
    //                     doc.Item = null;
    //                     doc.Item = null;
    //                     break;
    //                 default:
    //                     return callback(new Error("Something went wrong"));
    //             }

    //             callback(null, doc);
    //         },
    //     };
    //     const botStorage = new FireBaseBotStorage(dynamoClient, settings);

    //     it("should fetch data with the DynamoDB client (1)", (done) => {
    //         const context: IBotStorageContext = {
    //             userId: "default-user",
    //             conversationId: "123456789",
    //             persistUserData: true,
    //             persistConversationData: true,
    //         };

    //         botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
    //             const { userData, conversationData, privateConversationData } = data;
    //             expect(userData).to.deep.equal({ state: "user specific" });
    //             expect(conversationData).to.deep.equal({ state: "public" });
    //             expect(privateConversationData).to.deep.equal({ state: "private" });
    //             done();
    //         });
    //     });

    //     it("should fetch data with the DynamoDB client (2)", (done) => {
    //         const context = {
    //             userId: "default-user",
    //             persistUserData: false,
    //             persistConversationData: false,
    //         };

    //         botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
    //             expect(data).to.deep.equal({});
    //             done();
    //         });
    //     });

    //     it("should fetch data with the DynamoDB client (3)", (done) => {
    //         const context = {
    //             userId: "null",
    //             persistUserData: true,
    //             persistConversationData: false,
    //         };

    //         botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
    //             expect(data.userData).to.deep.equal({});
    //             doc.Item = {
    //                 data: { S: "" },
    //                 hash: { S: "" },
    //             };
    //             done();
    //         });
    //     });

    //     it("should fetch data with the DynamoDB client (4)", (done) => {
    //         const context = {
    //             persistUserData: false,
    //             persistConversationData: false,
    //         };

    //         botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
    //             expect(data).to.deep.equal({});
    //             done();
    //         });
    //     });

    //     it("should catch errors thrown while fetching data", (done) => {
    //         const context: IBotStorageContext = {
    //             userId: "error",
    //             persistUserData: true,
    //             persistConversationData: false,
    //         };

    //         botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
    //             expect(err.message).to.equal("Something went wrong");
    //             done();
    //         });
    //     });
    // });

    // describe("saveData", () => {
    //     const data: IBotStorageDataHash = {
    //         userData: { state: "user specific" } as any,
    //         // Use an actual correct hash once for code coverage purposes
    //         userDataHash: "f365860ae6855894e368268d695b061bf3503094e0431b581f5b944db232ffd0",
    //         conversationData: { state: "public" } as any,
    //         conversationDataHash: "__conversationDataHash__",
    //         privateConversationData: { state: "private" } as any,
    //         privateConversationDataHash: "__privateConversationDataHash__",
    //     };
    //     const ttl: ITTLSettings = {
    //         userData: 3600 * 24 * 365,
    //         conversationData: 3600 * 24,
    //         privateConversationData: 3600 * 24,
    //     };
    //     const settings = { tableName: "botdata", primaryKey: "id", ttl };

    //     // Mock of DynamoDB client
    //     let dynamoClient = {
    //         putItem(doc, callback) {
    //             const primaryKeyObject = doc.Item[settings.primaryKey];
    //             const primaryKeyValue = primaryKeyObject && primaryKeyObject.S;

    //             switch (primaryKeyValue) {
    //                 case "default-user":
    //                     expect(doc.Item.data.S).to.equal(JSON.stringify(data.userData));
    //                     expect(doc.Item.hash.S).to.equal(data.userDataHash);
    //                     break;
    //                 case "default-user:123456789":
    //                     expect(doc.Item.data.S).to.equal(JSON.stringify(data.privateConversationData));
    //                     expect(doc.Item.hash.S).to.not.equal(data.privateConversationDataHash);
    //                     break;
    //                 case "123456789":
    //                     expect(doc.Item.data.S).to.equal(JSON.stringify(data.conversationData));
    //                     expect(doc.Item.hash.S).to.not.equal(data.conversationDataHash);
    //                     break;
    //                 case "null":
    //                     break;
    //                 default:
    //                     return callback(new Error("Something went wrong"));
    //             }

    //             callback(null);
    //         },
    //     };
    //     const botStorage = new FireBaseBotStorage(dynamoClient, settings);

    //     it("should save data with the DynamoDB client (1)", (done) => {
    //         const context: IBotStorageContext = {
    //             userId: "default-user",
    //             conversationId: "123456789",
    //             persistUserData: true,
    //             persistConversationData: true,
    //         };

    //         botStorage.saveData(context, data, (err: Error) => {
    //             // tslint:disable-next-line:no-unused-expression
    //             expect(err).to.be.null;
    //             done();
    //         });
    //     });

    //     it("should save data with the DynamoDB client (2)", (done) => {
    //         const context = {
    //             userId: "default-user",
    //             persistUserData: false,
    //             persistConversationData: false,
    //         };

    //         botStorage.saveData(context, data, (err: Error) => {
    //             // tslint:disable-next-line:no-unused-expression
    //             expect(err).to.be.null;
    //             done();
    //         });
    //     });

    //     it("should save data with the DynamoDB client (3)", (done) => {
    //         const context = {
    //             persistUserData: false,
    //             persistConversationData: false,
    //         };

    //         botStorage.saveData(context, data, (err: Error) => {
    //             // tslint:disable-next-line:no-unused-expression
    //             expect(err).to.be.null;
    //             done();
    //         });
    //     });

    //     it("should save data with the DynamoDB client (4)", (done) => {
    //         const context = {
    //             userId: "default-user",
    //             conversationId: "123456789",
    //             persistUserData: true,
    //             persistConversationData: true,
    //         };
    //         const data = {
    //             userData: null,
    //             userDataHash: null,
    //             conversationData: null,
    //             conversationDataHash: null,
    //             privateConversationData: null,
    //             privateConversationDataHash: null,
    //         };
    //         const settings = { tableName: "botdata", primaryKey: "id" };

    //         // New db mock to extend code coverage
    //         dynamoClient = {
    //             putItem(doc, callback) {
    //                 const primaryKey = doc.Item[settings.primaryKey];
    //                 switch (primaryKey) {
    //                     case "default-user":
    //                         expect(doc.Item.data).to.equal(JSON.stringify({}));
    //                         expect(doc.Item.hash).to.equal(
    //                             "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
    //                         break;
    //                     case "default-user:123456789":
    //                         expect(doc.Item.data).to.equal(JSON.stringify({}));
    //                         expect(doc.Item.hash).to.equal(
    //                             "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
    //                         break;
    //                     case "123456789":
    //                         expect(doc.Item.data).to.equal(JSON.stringify({}));
    //                         expect(doc.Item.hash).to.equal(
    //                             "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
    //                         break;
    //                 }

    //                 callback(null);
    //             },
    //         };

    //         const botStorage = new FireBaseBotStorage(dynamoClient, settings);
    //         botStorage.saveData(context, data, (err: Error) => {
    //             // tslint:disable-next-line:no-unused-expression
    //             expect(err).to.be.null;
    //             done();
    //         });
    //     });

    //     it("should catch errors thrown while saving data", (done) => {
    //         const data: IBotStorageDataHash = {
    //             userData: { state: "user specific" } as any,
    //             userDataHash: "__userDataHash__",
    //             conversationData: { state: "public" } as any,
    //             conversationDataHash: "__conversationDataHash__",
    //             privateConversationData: { state: "private" } as any,
    //             privateConversationDataHash: "__privateConversationDataHash__",
    //         };
    //         const errorMessage = "Something went wrong";

    //         const context: IBotStorageContext = {
    //             userId: "error",
    //             persistUserData: true,
    //             persistConversationData: false,
    //         };

    //         botStorage.saveData(context, data, (err: Error) => {
    //             expect(err.message).to.equal(errorMessage);
    //             done();
    //         });
    //     });
    // });
});
