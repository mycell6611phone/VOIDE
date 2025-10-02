import { z } from "zod";
export declare const PortSchema: z.ZodObject<{
    port: z.ZodString;
    types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    port: z.ZodString;
    types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    port: z.ZodString;
    types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type Port = z.infer<typeof PortSchema>;
export declare const NodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    in: z.ZodDefault<z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    out: z.ZodDefault<z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    type: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    in: z.ZodDefault<z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    out: z.ZodDefault<z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    type: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    in: z.ZodDefault<z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    out: z.ZodDefault<z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        port: z.ZodString;
        types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type Node = z.infer<typeof NodeSchema>;
export declare const EdgeSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    label: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodOptional<z.ZodString>;
    from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    label: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodOptional<z.ZodString>;
    from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    label: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type Edge = z.infer<typeof EdgeSchema>;
export declare const FlowEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    nodes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    nodes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    nodes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        in: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        out: z.ZodDefault<z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            port: z.ZodString;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodOptional<z.ZodString>;
        from: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        to: z.ZodTuple<[z.ZodString, z.ZodString], null>;
        label: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type FlowEnvelope = z.infer<typeof FlowEnvelopeSchema>;
export declare function parseFlow(text: string): FlowEnvelope;
