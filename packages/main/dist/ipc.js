"use strict";

import { ipcMain, dialog } from "electron";
import fs from "fs";
import Ajv from "ajv";

import { getDB } from "./services/db";
import { getSecretsService } from "./services/secrets";
import { runFlow, stepFlow, stopFlow, getLastRunPayloads, getNodeCatalog } from "./orchestrator/engine";
import { getModelRegistry } from "./services/models";

// Declare setupIPC now, but define it later after schemas are loaded
export let setupIPC: () => Promise<void>;

(async () => {
  const schemas_1 = await import("@voide/schemas");

  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile(schemas_1.flowSchema);

  setupIPC = async function setupIPC() {
    ipcMain.handle("voide:openFlow", async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "Flow", extensions: ["json"] }],
      });
      if (canceled || !filePaths[0]) return { canceled: true };

      const json = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
      if (!validate(json)) return { error: ajv.errorsText(validate.errors) };
      return { path: filePaths[0], flow: json };
    });

    ipcMain.handle("voide:saveFlow", async (_e, args) => {
      const flow = args.flow;
      if (!validate(flow)) return { error: ajv.errorsText(validate.errors) };

      const db = getDB();
      db.prepare(
        "insert or replace into flows(id,name,json,version,updated_at) values(?,?,?,?,strftime('%s','now'))"
      ).run(flow.id, flow.id, JSON.stringify(flow), flow.version);

      const savePath =
        args.filePath ?? (await dialog.showSaveDialog({ defaultPath: `${flow.id}.json` })).filePath;

      if (savePath) fs.writeFileSync(savePath, JSON.stringify(flow, null, 2));
      return { path: savePath };
    });

    ipcMain.handle("voide:validateFlow", async (_e, raw) => {
      const flow = raw;
      const ok = validate(flow);
      return { ok, errors: ok ? [] : validate.errors };
    });

    ipcMain.handle("voide:listModels", async () => getModelRegistry());
    ipcMain.handle("voide:getNodeCatalog", async () => getNodeCatalog());
    ipcMain.handle("voide:getLastRunPayloads", async (_e, runId) => getLastRunPayloads(runId));
    ipcMain.handle("voide:runFlow", async (_e, args) => runFlow(args.flow));
    ipcMain.handle("voide:stopFlow", async (_e, { runId }) => stopFlow(runId));
    ipcMain.handle("voide:stepFlow", async (_e, { runId }) => stepFlow(runId));
    ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) =>
      getSecretsService().set(scope, key, value)
    );
    ipcMain.handle("voide:secretGet", async (_e, { scope, key }) =>
      getSecretsService().get(scope, key)
    );
  };
})();

