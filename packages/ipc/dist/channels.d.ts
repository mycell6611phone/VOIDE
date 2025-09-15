import { z } from "zod";
export declare const Flow: z.ZodObject<{
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
export type Flow = z.infer<typeof Flow>;
export declare const flowValidate: {
    name: string;
    request: z.ZodObject<{
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
    response: z.ZodObject<{
        ok: z.ZodBoolean;
        errors: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        ok: boolean;
        errors: string[];
    }, {
        ok: boolean;
        errors: string[];
    }>;
};
export type FlowValidateReq = z.infer<typeof flowValidate.request>;
export type FlowValidateRes = z.infer<typeof flowValidate.response>;
export declare const flowRun: {
    name: string;
    request: z.ZodObject<{
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
    response: z.ZodObject<{
        runId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        runId: string;
    }, {
        runId: string;
    }>;
};
export type FlowRunReq = z.infer<typeof flowRun.request>;
export type FlowRunRes = z.infer<typeof flowRun.response>;
export declare const modelEnsure: {
    name: string;
    request: z.ZodObject<{
        modelId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        modelId: string;
    }, {
        modelId: string;
    }>;
    response: z.ZodObject<{
        ok: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        ok: boolean;
    }, {
        ok: boolean;
    }>;
};
export type ModelEnsureReq = z.infer<typeof modelEnsure.request>;
export type ModelEnsureRes = z.infer<typeof modelEnsure.response>;
export declare const telemetryPayload: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"node_state">;
    runId: z.ZodString;
    nodeId: z.ZodString;
    state: z.ZodString;
    at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "node_state";
    at: number;
    runId: string;
    nodeId: string;
    state: string;
}, {
    type: "node_state";
    at: number;
    runId: string;
    nodeId: string;
    state: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"edge_transfer">;
    runId: z.ZodString;
    edgeId: z.ZodString;
    bytes: z.ZodNumber;
    at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "edge_transfer";
    at: number;
    runId: string;
    edgeId: string;
    bytes: number;
}, {
    type: "edge_transfer";
    at: number;
    runId: string;
    edgeId: string;
    bytes: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"normalize">;
    runId: z.ZodString;
    nodeId: z.ZodString;
    fromType: z.ZodString;
    toType: z.ZodString;
    at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "normalize";
    at: number;
    runId: string;
    nodeId: string;
    fromType: string;
    toType: string;
}, {
    type: "normalize";
    at: number;
    runId: string;
    nodeId: string;
    fromType: string;
    toType: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    runId: z.ZodString;
    nodeId: z.ZodString;
    code: z.ZodString;
    message: z.ZodString;
    at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "error";
    code: string;
    message: string;
    at: number;
    runId: string;
    nodeId: string;
}, {
    type: "error";
    code: string;
    message: string;
    at: number;
    runId: string;
    nodeId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"operation_progress">;
    runId: z.ZodString;
    nodeId: z.ZodString;
    tokens: z.ZodNumber;
    latencyMs: z.ZodNumber;
    status: z.ZodEnum<["ok", "error"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "operation_progress";
    status: "ok" | "error";
    runId: string;
    nodeId: string;
    tokens: number;
    latencyMs: number;
    reason?: string | undefined;
}, {
    type: "operation_progress";
    status: "ok" | "error";
    runId: string;
    nodeId: string;
    tokens: number;
    latencyMs: number;
    reason?: string | undefined;
}>]>;
export type TelemetryPayload = z.infer<typeof telemetryPayload>;
export declare const telemetryEvent: {
    name: string;
    payload: z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"node_state">;
        runId: z.ZodString;
        nodeId: z.ZodString;
        state: z.ZodString;
        at: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "node_state";
        at: number;
        runId: string;
        nodeId: string;
        state: string;
    }, {
        type: "node_state";
        at: number;
        runId: string;
        nodeId: string;
        state: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"edge_transfer">;
        runId: z.ZodString;
        edgeId: z.ZodString;
        bytes: z.ZodNumber;
        at: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "edge_transfer";
        at: number;
        runId: string;
        edgeId: string;
        bytes: number;
    }, {
        type: "edge_transfer";
        at: number;
        runId: string;
        edgeId: string;
        bytes: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"normalize">;
        runId: z.ZodString;
        nodeId: z.ZodString;
        fromType: z.ZodString;
        toType: z.ZodString;
        at: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "normalize";
        at: number;
        runId: string;
        nodeId: string;
        fromType: string;
        toType: string;
    }, {
        type: "normalize";
        at: number;
        runId: string;
        nodeId: string;
        fromType: string;
        toType: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"error">;
        runId: z.ZodString;
        nodeId: z.ZodString;
        code: z.ZodString;
        message: z.ZodString;
        at: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "error";
        code: string;
        message: string;
        at: number;
        runId: string;
        nodeId: string;
    }, {
        type: "error";
        code: string;
        message: string;
        at: number;
        runId: string;
        nodeId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"operation_progress">;
        runId: z.ZodString;
        nodeId: z.ZodString;
        tokens: z.ZodNumber;
        latencyMs: z.ZodNumber;
        status: z.ZodEnum<["ok", "error"]>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "operation_progress";
        status: "ok" | "error";
        runId: string;
        nodeId: string;
        tokens: number;
        latencyMs: number;
        reason?: string | undefined;
    }, {
        type: "operation_progress";
        status: "ok" | "error";
        runId: string;
        nodeId: string;
        tokens: number;
        latencyMs: number;
        reason?: string | undefined;
    }>]>;
};
export declare const appGetVersion: {
    name: string;
    request: z.ZodUndefined;
    response: z.ZodString;
};
export type AppGetVersionRes = z.infer<typeof appGetVersion.response>;
