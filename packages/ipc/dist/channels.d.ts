import { z } from "zod";
export declare const Flow: any;
export type Flow = z.infer<typeof Flow>;
export declare const flowValidate: {
    name: string;
    request: any;
    response: any;
};
export type FlowValidateReq = z.infer<typeof flowValidate.request>;
export type FlowValidateRes = z.infer<typeof flowValidate.response>;
export declare const flowRun: {
    name: string;
    request: any;
    response: any;
};
export type FlowRunReq = z.infer<typeof flowRun.request>;
export type FlowRunRes = z.infer<typeof flowRun.response>;
export declare const modelEnsure: {
    name: string;
    request: any;
    response: any;
};
export type ModelEnsureReq = z.infer<typeof modelEnsure.request>;
export type ModelEnsureRes = z.infer<typeof modelEnsure.response>;
export declare const telemetryPayload: any;
export type TelemetryPayload = z.infer<typeof telemetryPayload>;
export declare const telemetryEvent: {
    name: string;
    payload: any;
};
export declare const appGetVersion: {
    name: string;
    request: any;
    response: any;
};
export type AppGetVersionRes = z.infer<typeof appGetVersion.response>;
export declare const chatWindowOpen: {
    name: string;
    request: any;
    response: any;
};
export type ChatWindowOpenRes = z.infer<typeof chatWindowOpen.response>;
