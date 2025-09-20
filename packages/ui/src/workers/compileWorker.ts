import { compile, Canvas } from "../../../core/src/build/compiler";

self.onmessage = (e: MessageEvent<Canvas>) => {
  try {
    const bin = compile(e.data);
    // postMessage can't send Uint8Array directly in some browsers without transfer
    self.postMessage({ type: "success", bin }, [bin.buffer]);
  } catch (err) {
    self.postMessage({ type: "error", message: (err as Error).message });
  }
};

export {};

