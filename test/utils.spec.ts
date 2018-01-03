/* import { expect } from "chai";
const { validateTTLSettings } = require("../lib/utils");

describe("validateTTLSettings", () => {
    it("should return false when invoked with invalid settings", () => {
        const settings = {
            userData: null,
            conversationData: null,
            privateConversationData: null,
        };
        // tslint:disable-next-line:no-unused-expression
        expect(validateTTLSettings(settings)).to.be.false;
    });

    it("should return true when invoked with valid settings", () => {
        const settings = {
            userData: 3600 * 24 * 365,
            conversationData: 3600 * 24 * 30,
            privateConversationData: 3600 * 24 * 30,
        };
        // tslint:disable-next-line:no-unused-expression
        expect(validateTTLSettings(settings)).to.be.true;
    });
}); */
