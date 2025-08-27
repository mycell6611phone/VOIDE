// Placeholder secrets service for compilation without key storage.
export function getSecretsService() {
  return {
    set: async (_scope: string, _key: string, _value: string) => ({ ok: true }),
    get: async (_scope: string, _key: string) => ({ value: null })
  };
}
