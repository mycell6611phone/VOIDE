"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretsService = getSecretsService;
function getSecretsService() {
    return {
        set: async (_scope, _key, _value) => ({ ok: true }),
        get: async (_scope, _key) => ({ value: null })
    };
}
