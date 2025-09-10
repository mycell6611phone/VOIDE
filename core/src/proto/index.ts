export interface UserText {
  text: string;
}

export const UserText = {
  encode(message: UserText): Uint8Array {
    const json = JSON.stringify(message);
    return new TextEncoder().encode(json);
  },
  decode(data: Uint8Array): UserText {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }
};

export interface PromptText {
  text: string;
}

export const PromptText = {
  encode(message: PromptText): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(message));
  },
  decode(data: Uint8Array): PromptText {
    return JSON.parse(new TextDecoder().decode(data));
  }
};

export interface LLMText {
  text: string;
}

export const LLMText = {
  encode(message: LLMText): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(message));
  },
  decode(data: Uint8Array): LLMText {
    return JSON.parse(new TextDecoder().decode(data));
  }
};

export interface AnyBlob {
  data: Uint8Array;
}

export const AnyBlob = {
  encode(message: AnyBlob): Uint8Array {
    return message.data;
  },
  decode(data: Uint8Array): AnyBlob {
    return { data };
  }
};

