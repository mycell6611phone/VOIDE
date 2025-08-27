"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.getDB = getDB;
exports.createRun = createRun;
exports.updateRunStatus = updateRunStatus;
exports.recordRunLog = recordRunLog;
exports.savePayload = savePayload;
exports.getPayloadsForRun = getPayloadsForRun;
async function initDB() { return; }
function getDB() { return {}; }
async function createRun(_runId, _flowId) { return; }
function updateRunStatus(_runId, _status) { return; }
async function recordRunLog(_log) { return; }
async function savePayload(_runId, _nodeId, _port, _payload) { return; }
async function getPayloadsForRun(_runId) { return []; }
