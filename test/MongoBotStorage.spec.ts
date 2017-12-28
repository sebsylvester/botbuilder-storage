import { IBotStorageContext, IBotStorageData } from 'botbuilder';
const expect = require('chai').expect;
const sinon = require('sinon');
const { MongoBotStorage } = require('../lib/');


describe('MongoBotStorage', function () {
    describe('constructor', function () {
        it('should set the collection value', function () {
            const botStorage = new MongoBotStorage({}, { collection: 'storage' });
            expect(botStorage.collection).to.equal('storage');
        });

        it('should default to collection "botdata"', function () {
            const botStorage = new MongoBotStorage({});
            expect(botStorage.collection).to.equal('botdata');
        });

        it('should throw an error when invoked with invalid option values', function () {            
            function throwsException() {
                const botStorage = new MongoBotStorage({}, { collection: {}});
            }
            const errorMessage = 'Invalid options value, "collection" must be of type string.'
            expect(throwsException).to.throw(errorMessage);
        });
    });

    describe('getData', function () {
        it('should fetch data with the MongoDB client', function (done) {
            // Mock of MongoDB client
            const db = {
                collection() {
                    return {
                        findOne(filter, callback) {
                            const doc = { data: null };
                            const data = <IBotStorageData>{
                                userData: { state: 'user specific' },
                                conversationData: { state: 'public' },
                                privateConversationData: { state: 'private' }
                            }
                            switch (filter._id) {
                                case 'default-user':
                                    doc.data = JSON.stringify(data.userData);
                                    break;
                                case 'default-user:123456789':
                                    doc.data = JSON.stringify(data.privateConversationData);
                                    break;
                                case '123456789':
                                    doc.data = JSON.stringify(data.conversationData);
                                    break;
                                case 'null':
                                    break;
                                default:
                                    throw new Error('unknown _id value');
                            }
                            
                            callback(null, doc);
                        }
                    }
                }
            }
            const botStorage = new MongoBotStorage(db);

            let context: IBotStorageContext = {
                userId: 'default-user',
                conversationId: '123456789',
                persistUserData: true,
                persistConversationData: true
            }

            botStorage.getData(context, (err: Error, data: IBotStorageData) => {
                const { userData, conversationData, privateConversationData } = data;
                expect(userData).to.deep.equal({ state: 'user specific' });
                expect(conversationData).to.deep.equal({ state: 'public' });
                expect(privateConversationData).to.deep.equal({ state: 'private' });
            });

            // Different context to obtain full code coverage
            context = {
                userId: 'default-user',
                persistUserData: false,
                persistConversationData: false
            }

            botStorage.getData(context, (err: Error, data: IBotStorageData) => {
                expect(data).to.deep.equal({});
            });

            // Different context to obtain full code coverage
            context = {
                userId: 'null',
                persistUserData: true,
                persistConversationData: false
            }

            botStorage.getData(context, (err: Error, data: IBotStorageData) => {
                expect(data.userData).to.deep.equal({});
            });

            // Different context to obtain full code coverage
            context = {
                persistUserData: false,
                persistConversationData: false
            }

            botStorage.getData(context, (err: Error, data: IBotStorageData) => {
                expect(data).to.deep.equal({});
                done();
            });
        });

        it('should catch errors thrown while fetching data', function (done) {
            const errorMessage = 'Something went wrong';

            // Mock of MongoDB client
            const db = {
                collection() {
                    return {
                        findOne(filter, callback) {
                            callback(new Error(errorMessage));
                        }
                    }
                }
            }
            const botStorage = new MongoBotStorage(db);

            let context: IBotStorageContext = {
                userId: 'default-user',
                persistUserData: true,
                persistConversationData: false
            }

            botStorage.getData(context, (err: Error, data: IBotStorageData) => {
                expect(err.message).to.equal(errorMessage);
                done();
            });
        });
    });

    describe('saveData', function () {
        it('should save data with the MongoDB client', function (done) {
            let data: IBotStorageData = {
                userData: { state: 'user specific' },
                conversationData: { state: 'public' },
                privateConversationData: { state: 'private' }
            }

            // Mock of MongoDB client
            let db = {
                collection() {
                    return {
                        update(filter, update, options, callback) {
                            switch (filter._id) {
                                case 'default-user':
                                    expect(update._id).to.equal('default-user');
                                    expect(update.data).to.equal(JSON.stringify(data.userData));
                                    break;
                                case 'default-user:123456789':
                                    expect(update._id).to.equal('default-user:123456789');
                                    expect(update.data).to.equal(JSON.stringify(data.privateConversationData));
                                    break;
                                case '123456789':
                                    expect(update._id).to.equal('123456789');
                                    expect(update.data).to.equal(JSON.stringify(data.conversationData));
                                    break;
                                case 'null':
                                    break;
                                default:
                                    throw new Error('unknown _id value');
                            }

                            callback(null);
                        }
                    }
                }
            }

            const botStorage = new MongoBotStorage(db);

            let context: IBotStorageContext = {
                userId: 'default-user',
                conversationId: '123456789',
                persistUserData: true,
                persistConversationData: true
            }

            botStorage.saveData(context, data, (err: Error) => {
                expect(err).to.be.null;
            });            
            
            // Different context to obtain full code coverage
            context = {
                userId: 'default-user',
                persistUserData: false,
                persistConversationData: false
            }
            
            botStorage.saveData(context, data, (err: Error) => {
                expect(err).to.be.null;
            });

            // Different context to obtain full code coverage
            context = {
                persistUserData: false,
                persistConversationData: false
            }
            
            botStorage.saveData(context, data, (err: Error) => {
                expect(err).to.be.null;
            });

            // Different context, data and mock to obtain full code coverage
            context = {
                userId: 'default-user',
                conversationId: '123456789',
                persistUserData: true,
                persistConversationData: true
            }            
            data = {
                userData: null,
                conversationData: null,
                privateConversationData: null
            }
            let db2 = {
                collection() {
                    return {
                        update(filter, update, options, callback) {
                            switch (filter._id) {
                                case 'default-user':
                                    expect(update._id).to.equal('default-user');
                                    expect(update.data).to.equal(JSON.stringify({}));
                                    break;
                                case 'default-user:123456789':
                                    expect(update._id).to.equal('default-user:123456789');
                                    expect(update.data).to.equal(JSON.stringify({}));
                                    break;
                                case '123456789':
                                    expect(update._id).to.equal('123456789');
                                    expect(update.data).to.equal(JSON.stringify({}));
                                    break;
                                case 'null':
                                    break;
                                default:
                                    throw new Error('unknown _id value');
                            }

                            callback(null);
                        }
                    }
                }
            }

            botStorage.db = db2;
            botStorage.saveData(context, data, (err: Error) => {
                expect(err).to.be.null;
                done();
            });
        });

        it('should catch errors thrown while saving data', function (done) {
            const data: IBotStorageData = {
                userData: { state: 'user specific' },
                conversationData: { state: 'public' },
                privateConversationData: { state: 'private' }
            }
            const errorMessage = 'Something went wrong';

            // Mock of MongoDB client
            const db = {
                collection() {
                    return {
                        update(filter, update, options, callback) {
                            callback(new Error(errorMessage));
                        }
                    }
                }
            }
            const botStorage = new MongoBotStorage(db);

            let context: IBotStorageContext = {
                userId: 'default-user',
                persistUserData: true,
                persistConversationData: false
            }

            botStorage.saveData(context, data, (err: Error) => {
                expect(err.message).to.equal(errorMessage);
                done();
            });            
        });
    });
});