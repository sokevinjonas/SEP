"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const serverless_http_1 = __importDefault(require("serverless-http"));
const index_js_1 = require("./index.js");
const serverlessHandler = (0, serverless_http_1.default)(index_js_1.app);
const handler = async (event, context) => {
    // Strip Netlify redirect prefix so Express routes match correctly (/api/*)
    if (event && event.path) {
        if (event.path.startsWith('/.netlify/functions/serverless')) {
            event.path = event.path.replace('/.netlify/functions/serverless', '');
        }
        else if (event.path.startsWith('/.netlify/functions/api')) {
            event.path = event.path.replace('/.netlify/functions/api', '');
        }
    }
    return serverlessHandler(event, context);
};
exports.handler = handler;
