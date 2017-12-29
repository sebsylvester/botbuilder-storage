import { IBotStorageContext } from 'botbuilder';
import { IBotHashedStorageData } from '../lib/types'
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
                            const doc = { data: null, hash: null };
                            const data = <IBotHashedStorageData>{
                                userData: { state: 'user specific' },
                                userDataHash: '__userDataHash__',
                                conversationData: { state: 'public' },
                                conversationDataHash: '__conversationDataHash__',
                                privateConversationData: { state: 'private' },
                                privateConversationDataHash: '__privateConversationDataHash__'
                            }
                            switch (filter._id) {
                                case 'default-user':
                                    doc.data = JSON.stringify(data.userData);
                                    doc.hash = data.userDataHash;
                                    break;
                                case 'default-user:123456789':
                                    doc.data = JSON.stringify(data.privateConversationData);
                                    doc.hash = data.privateConversationDataHash;
                                    break;
                                case '123456789':
                                    doc.data = JSON.stringify(data.conversationData);
                                    doc.hash = data.conversationDataHash;
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

            botStorage.getData(context, (err: Error, data: IBotHashedStorageData) => {
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

            botStorage.getData(context, (err: Error, data: IBotHashedStorageData) => {
                expect(data).to.deep.equal({});
            });

            // Different context to obtain full code coverage
            context = {
                userId: 'null',
                persistUserData: true,
                persistConversationData: false
            }

            botStorage.getData(context, (err: Error, data: IBotHashedStorageData) => {
                expect(data.userData).to.deep.equal({});
            });

            // Different context to obtain full code coverage
            context = {
                persistUserData: false,
                persistConversationData: false
            }

            botStorage.getData(context, (err: Error, data: IBotHashedStorageData) => {
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

            botStorage.getData(context, (err: Error, data: IBotHashedStorageData) => {
                expect(err.message).to.equal(errorMessage);
                done();
            });
        });
    });

    describe('saveData', function () {
        it('should save data with the MongoDB client', function (done) {
            let data: IBotHashedStorageData = {
                userData: <any>{ state: 'user specific' },
                // Use an actual correct hash once for code coverage purposes
                userDataHash: 'f365860ae6855894e368268d695b061bf3503094e0431b581f5b944db232ffd0',
                conversationData: <any>{ state: 'public' },
                conversationDataHash: '__conversationDataHash__',
                privateConversationData: <any>{ state: 'private' },
                privateConversationDataHash: '__privateConversationDataHash__'
            }

            // Mock of MongoDB client
            let db = {
                collection() {
                    return {
                        update(filter, update, options, callback) {
                            switch (filter._id) {
                                case 'default-user':
                                    expect(filter._id).to.equal('default-user');
                                    expect(update.data).to.equal(JSON.stringify(data.userData));
                                    expect(update.hash).to.equal(data.userDataHash);
                                    break;
                                case 'default-user:123456789':
                                    expect(filter._id).to.equal('default-user:123456789');
                                    expect(update.data).to.equal(JSON.stringify(data.privateConversationData));
                                    expect(update.hash).to.not.equal(data.privateConversationDataHash);
                                    break;
                                case '123456789':
                                    expect(filter._id).to.equal('123456789');
                                    expect(update.data).to.equal(JSON.stringify(data.conversationData));
                                    expect(update.hash).to.not.equal(data.conversationDataHash);
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
                userDataHash: null,
                conversationData: null,
                conversationDataHash: null,
                privateConversationData: null,
                privateConversationDataHash: null
            }
            let db2 = {
                collection() {
                    return {
                        update(filter, update, options, callback) {
                            switch (filter._id) {
                                case 'default-user':
                                    expect(filter._id).to.equal('default-user');
                                    expect(update.data).to.equal(JSON.stringify({}));
                                    break;
                                case 'default-user:123456789':
                                    expect(filter._id).to.equal('default-user:123456789');
                                    expect(update.data).to.equal(JSON.stringify({}));
                                    break;
                                case '123456789':
                                    expect(filter._id).to.equal('123456789');
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
            const data: IBotHashedStorageData = {
                userData: <any>{ state: 'user specific' },
                userDataHash: '__userDataHash__',
                conversationData: <any>{ state: 'public' },
                conversationDataHash: '__conversationDataHash__',
                privateConversationData: <any>{ state: 'private' },
                privateConversationDataHash: '__privateConversationDataHash__'
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