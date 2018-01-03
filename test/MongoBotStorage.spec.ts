import { IBotStorageContext } from "botbuilder";
import { expect } from "chai";
import { IBotStorageDataHash, IMongoBotStorageSettings, ITTLSettings } from "../lib/types";
const { MongoBotStorage } = require("../lib/storage/MongoBotStorage");


describe("MongoBotStorage", () => {
    describe("constructor", () => {
        const errorMessage = "Invalid constructor arguments for the MongoBotStorage class.";

        it("should set the collection value on the settings property", () => {
            const botStorage = new MongoBotStorage({}, { collection: "storage" });
            expect(botStorage.settings.collection).to.equal("storage");
        });

        it("should set the ttl property with valid settings", () => {
            const ttl: ITTLSettings = {
                userData: Date.now() + 3600 * 1000 * 24,
                conversationData: Date.now() + 3600 * 1000 * 24,
                privateConversationData: Date.now() + 3600 * 1000 * 24,
            };
            const botStorage = new MongoBotStorage({}, {
                collection: "botstate",
                ttl,
            } as IMongoBotStorageSettings);
            expect(botStorage.ttl).to.deep.equal(ttl);
        });

        it("should throw an error when invoked without a database client", () => {
            function throwsException() {
                const botStorage = new MongoBotStorage();
            }
            expect(throwsException).to.throw(errorMessage);
        });

        it("should throw an error when invoked with invalid settings values (1)", () => {
            function throwsException() {
                const botStorage = new MongoBotStorage({}, {});
            }
            expect(throwsException).to.throw(errorMessage);
        });

        it("should throw an error when invoked with invalid settings values (2)", () => {
            function throwsException() {
                const botStorage = new MongoBotStorage({}, { collection: "botstate", ttl: {}});
            }
            expect(throwsException).to.throw("Invalid TTL settings.");
        });
    });

    describe("getData", () => {
        const doc: any = {};
        const data = {
            userData: { state: "user specific" },
            userDataHash: "__userDataHash__",
            conversationData: { state: "public" },
            conversationDataHash: "__conversationDataHash__",
            privateConversationData: { state: "private" },
            privateConversationDataHash: "__privateConversationDataHash__",
        };
        // Mock of MongoDB client
        const db = {
            collection() {
                return {
                    findOne(filter, callback) {
                        switch (filter._id) {
                            case "default-user":
                                doc.data = JSON.stringify(data.userData);
                                doc.hash = data.userDataHash;
                                break;
                            case "default-user:123456789":
                                doc.data = JSON.stringify(data.privateConversationData);
                                doc.hash = data.privateConversationDataHash;
                                break;
                            case "123456789":
                                doc.data = JSON.stringify(data.conversationData);
                                doc.hash = data.conversationDataHash;
                                break;
                            case "null":
                                doc.data = null;
                                doc.hash = null;
                                break;
                            default:
                                return callback(new Error("Something went wrong"));
                        }

                        callback(null, doc);
                    },
                };
            },
        };
        const botStorage = new MongoBotStorage(db, { collection: "botdata" });

        it("should fetch data with the MongoDB client (1)", (done) => {
            const context: IBotStorageContext = {
                userId: "default-user",
                conversationId: "123456789",
                persistUserData: true,
                persistConversationData: true,
            };

            botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
                const { userData, conversationData, privateConversationData } = data;
                expect(userData).to.deep.equal({ state: "user specific" });
                expect(conversationData).to.deep.equal({ state: "public" });
                expect(privateConversationData).to.deep.equal({ state: "private" });
                done();
            });
        });

        it("should fetch data with the MongoDB client (2)", (done) => {
            const context = {
                userId: "default-user",
                persistUserData: false,
                persistConversationData: false,
            };

            botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
                expect(data).to.deep.equal({});
                done();
            });
        });

        it("should fetch data with the MongoDB client (3)", (done) => {
            const context = {
                userId: "null",
                persistUserData: true,
                persistConversationData: false,
            };

            botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
                expect(data.userData).to.deep.equal({});
                done();
            });
        });

        it("should fetch data with the MongoDB client (4)", (done) => {
            const context = {
                persistUserData: false,
                persistConversationData: false,
            };

            botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
                expect(data).to.deep.equal({});
                done();
            });
        });

        it("should catch errors thrown while fetching data", (done) => {
            const context: IBotStorageContext = {
                userId: "error",
                persistUserData: true,
                persistConversationData: false,
            };

            botStorage.getData(context, (err: Error, data: IBotStorageDataHash) => {
                expect(err.message).to.equal("Something went wrong");
                done();
            });
        });
    });

    describe("saveData", () => {
        const data: IBotStorageDataHash = {
            userData: { state: "user specific" } as any,
            // Use an actual correct hash once for code coverage purposes
            userDataHash: "f365860ae6855894e368268d695b061bf3503094e0431b581f5b944db232ffd0",
            conversationData: { state: "public" } as any,
            conversationDataHash: "__conversationDataHash__",
            privateConversationData: { state: "private" } as any,
            privateConversationDataHash: "__privateConversationDataHash__",
        };
        // Mock of MongoDB client
        const db = {
            collection() {
                return {
                    update(filter, doc, options, callback) {
                        switch (filter._id) {
                            case "default-user":
                                expect(doc.data).to.equal(JSON.stringify(data.userData));
                                expect(doc.hash).to.equal(data.userDataHash);
                                break;
                            case "default-user:123456789":
                                expect(doc.data).to.equal(JSON.stringify(data.privateConversationData));
                                expect(doc.hash).to.not.equal(data.privateConversationDataHash);
                                break;
                            case "123456789":
                                expect(doc.data).to.equal(JSON.stringify(data.conversationData));
                                expect(doc.hash).to.not.equal(data.conversationDataHash);
                                break;
                            case "null":
                                break;
                            default:
                                return callback(new Error("Something went wrong"));
                        }

                        callback(null);
                    },
                };
            },
        };
        const ttl: ITTLSettings = {
            userData: 3600 * 24 * 365,
            conversationData: 3600 * 24,
            privateConversationData: 3600 * 24,
        };
        const botStorage = new MongoBotStorage(db, { collection: "botdata", ttl });

        it("should save data with the MongoDB client (1)", (done) => {
            const context: IBotStorageContext = {
                userId: "default-user",
                conversationId: "123456789",
                persistUserData: true,
                persistConversationData: true,
            };

            botStorage.saveData(context, data, (err: Error) => {
                // tslint:disable-next-line:no-unused-expression
                expect(err).to.be.null;
                done();
            });
        });

        it("should save data with the MongoDB client (2)", (done) => {
            const context = {
                userId: "default-user",
                persistUserData: false,
                persistConversationData: false,
            };

            botStorage.saveData(context, data, (err: Error) => {
                // tslint:disable-next-line:no-unused-expression
                expect(err).to.be.null;
                done();
            });
        });

        it("should save data with the MongoDB client (3)", (done) => {
            const context = {
                persistUserData: false,
                persistConversationData: false,
            };

            botStorage.saveData(context, data, (err: Error) => {
                // tslint:disable-next-line:no-unused-expression
                expect(err).to.be.null;
                done();
            });
        });

        it("should save data with the MongoDB client (4)", (done) => {
            const context = {
                userId: "default-user",
                conversationId: "123456789",
                persistUserData: true,
                persistConversationData: true,
            };
            const data = {
                userData: null,
                userDataHash: null,
                conversationData: null,
                conversationDataHash: null,
                privateConversationData: null,
                privateConversationDataHash: null,
            };
            // New db mock to extend code coverage
            const db = {
                collection() {
                    return {
                        update(filter, doc, options, callback) {
                            switch (filter._id) {
                                case "default-user":
                                    expect(doc.data).to.equal(JSON.stringify({}));
                                    expect(doc.hash).to.equal(
                                        "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
                                    break;
                                case "default-user:123456789":
                                    expect(doc.data).to.equal(JSON.stringify({}));
                                    expect(doc.hash).to.equal(
                                        "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
                                    break;
                                case "123456789":
                                    expect(doc.data).to.equal(JSON.stringify({}));
                                    expect(doc.hash).to.equal(
                                        "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
                                    break;
                            }

                            callback(null);
                        },
                    };
                },
            };

            const botStorage = new MongoBotStorage(db, { collection: "botdata" });
            botStorage.saveData(context, data, (err: Error) => {
                // tslint:disable-next-line:no-unused-expression
                expect(err).to.be.null;
                done();
            });
        });

        it("should catch errors thrown while saving data", (done) => {
            const data: IBotStorageDataHash = {
                userData: { state: "user specific" } as any,
                userDataHash: "__userDataHash__",
                conversationData: { state: "public" } as any,
                conversationDataHash: "__conversationDataHash__",
                privateConversationData: { state: "private" } as any,
                privateConversationDataHash: "__privateConversationDataHash__",
            };
            const errorMessage = "Something went wrong";

            const context: IBotStorageContext = {
                userId: "error",
                persistUserData: true,
                persistConversationData: false,
            };

            botStorage.saveData(context, data, (err: Error) => {
                expect(err.message).to.equal(errorMessage);
                done();
            });
        });
    });
});
