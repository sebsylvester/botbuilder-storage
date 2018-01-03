import { ITTLSettings } from "./types";

export function validateTTLSettings(settings: ITTLSettings ): boolean {
    const { userData: u, conversationData: c, privateConversationData: p } = settings;
    const invalidUserDataValue = !u || typeof u !== "number";
    const invalidConversationDataValue = !c || typeof c !== "number";
    const invalidPrivateConversationDataValue = !p || typeof p !== "number";

    if (invalidUserDataValue || invalidConversationDataValue || invalidPrivateConversationDataValue) {
        return false;
    }
    return true;
}
