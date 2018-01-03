import { IBotStorageContext, LocalizedRegExpRecognizer } from "botbuilder";
import { expect } from "chai";
import { IBotStorageDataHash, IRedisBotStorageSettings, ITTLSettings } from "../lib/types";
const { RedisBotStorage } = require("../lib/storage/RedisBotStorage");


describe("RedisBotStorage", () => {
    describe("constructor", () => {
        const errorMessage = "Invalid constructor arguments for the RedisBotStorage class.";

        it("should create an instance RedisBotStorage", () => {
            const botStorage = new RedisBotStorage({});
            expect(botStorage).to.be.instanceOf(RedisBotStorage);
        });

        it("should set the ttl property with valid settings", () => {
            const ttl: ITTLSettings = {
                userData: Date.now() + 3600 * 1000 * 24,
                conversationData: Date.now() + 3600 * 1000 * 24,
                privateConversationData: Date.now() + 3600 * 1000 * 24,
            };
            const botStorage = new RedisBotStorage({}, { ttl } as IRedisBotStorageSettings);
            expect(botStorage.ttl).to.deep.equal(ttl);
        });

        it("should throw an error when invoked without a database client", () => {
            function throwsException() {
                const botStorage = new RedisBotStorage();
            }
            expect(throwsException).to.throw(errorMessage);
        });

        it("should throw an error when invoked with invalid settings values (2)", () => {
            function throwsException() {
                const botStorage = new RedisBotStorage({}, { ttl: {}});
            }
            expect(throwsException).to.throw("Invalid TTL settings.");
        });
    });

    describe("getData", () => {
        let result: string;
        const data = {
            userData: { state: "user specific" },
            userDataHash: "__userDataHash__",
            conversationData: { state: "public" },
            conversationDataHash: "__conversationDataHash__",
            privateConversationData: { state: "private" },
            privateConversationDataHash: "__privateConversationDataHash__",
        };
        // Mock of Redis client
        const redisClient = {
            get(key, callback) {
                switch (key) {
                    case "userData:user:default-user":
                        result = JSON.stringify(data.userData) + "#" + data.userDataHash;
                        break;
                    case "privateConversationData:user:default-user:conversation:123456789":
                        result = JSON.stringify(data.privateConversationData) + "#" + data.privateConversationDataHash;
                        break;
                    case "conversationData:conversation:123456789":
                        result = JSON.stringify(data.conversationData) + "#" + data.conversationDataHash;
                        break;
                    case "userData:user:null":
                        result = null;
                        break;
                    default:
                        return callback(new Error("Something went wrong"));
                }

                callback(null, result);
            },
        };
        const botStorage = new RedisBotStorage(redisClient);

        it("should fetch data with the Redis client (1)", (done) => {
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

        it("should fetch data with the Redis client (2)", (done) => {
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

        it("should fetch data with the Redis client (3)", (done) => {
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

        it("should fetch data with the Redis client (4)", (done) => {
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
        // Mock of Redis client
        let redisClient = {
            set(...args) {
                const [key, value, command, timestamp, callback] = args;
                let expectedValue;
                switch (key) {
                    case "userData:user:default-user":
                        expectedValue = JSON.stringify(data.userData) + "#" + data.userDataHash;
                        expect(value).to.equal(expectedValue);
                        expect(timestamp).to.equal(3600 * 24 * 365);
                        break;
                    case "privateConversationData:user:default-user:conversation:123456789":
                        expectedValue =
                            JSON.stringify(data.privateConversationData) +
                            "#20b39cea11dd7dfb7e1c42ccc0763f7c13695ead5fe323d83b1276990e9a62fe";
                        expect(value).to.equal(expectedValue);
                        expect(timestamp).to.equal(3600 * 24);
                        break;
                    case "conversationData:conversation:123456789":
                        expectedValue =
                            JSON.stringify(data.conversationData) +
                            "#9e46a0fc882eb65631b18bae36379b6fd52b7c5733617e8d2e506b5df9aadb6b";
                        expect(value).to.equal(expectedValue);
                        expect(timestamp).to.equal(3600 * 24);
                        break;
                    default:
                        return callback(new Error("Something went wrong"));
                }

                callback(null);
            },
        };
        const ttl: ITTLSettings = {
            userData: 3600 * 24 * 365,
            conversationData: 3600 * 24,
            privateConversationData: 3600 * 24,
        };
        const botStorage = new RedisBotStorage(redisClient, { ttl });

        it("should save data with the Redis client (1)", (done) => {
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

        it("should save data with the Redis client (2)", (done) => {
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

        it("should save data with the Redis client (3)", (done) => {
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

        it("should save data with the Redis client (4)", (done) => {
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
            const prevRedisClient = redisClient;
            const expectedValue = JSON.stringify({})
            + "#44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
            redisClient = {
                set(...args) {
                    const [key, value, callback] = args;
                    switch (key) {
                        case "userData:user:default-user":
                            expect(value).to.equal(expectedValue);
                            break;
                        case "privateConversationData:user:default-user:conversation:123456789":
                            expect(value).to.equal(expectedValue);
                            break;
                        case "conversationData:conversation:123456789":
                            expect(value).to.equal(expectedValue);
                            break;
                        default:
                            return callback(new Error("Something went wrong"));
                    }
                    callback(null);
                },
            };

            const botStorage = new RedisBotStorage(redisClient);
            botStorage.saveData(context, data, (err: Error) => {
                // tslint:disable-next-line:no-unused-expression
                expect(err).to.be.null;
                redisClient = prevRedisClient;
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
