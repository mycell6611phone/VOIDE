export const NODE_ORIENTATION_PARAM_KEY = "__ioOrientation";

export type NodeOrientation = "default" | "reversed";

export const readNodeOrientation = (params: unknown): NodeOrientation => {
  if (!params || typeof params !== "object") {
    return "default";
  }
  const record = params as Record<string, unknown>;
  return record[NODE_ORIENTATION_PARAM_KEY] === "reversed"
    ? "reversed"
    : "default";
};

export const toggleNodeOrientationParams = (
  previous: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const base =
    previous && typeof previous === "object"
      ? { ...previous }
      : ({} as Record<string, unknown>);
  const current = readNodeOrientation(base);
  if (current === "reversed") {
    delete base[NODE_ORIENTATION_PARAM_KEY];
    return base;
  }
  return { ...base, [NODE_ORIENTATION_PARAM_KEY]: "reversed" };
};

