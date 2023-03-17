"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = exports.actionsGithub = exports.actionsCore = void 0;
// This file is the entry point for the `build:ncc` script. DO NOT remove this file unless you are
// planning to change the way actions build. `ncc` will use this entry point to create a single JS
// file including all `node_modules` dependencies. This method ensures only required files in
// `node_modules` are actually included in the final build artifact which reduces a lot of bytes
// downloaded when GitHub actions calls files. All `src/actions/*` files import this `lib` directly.
const actionsCore = __importStar(require("@actions/core"));
exports.actionsCore = actionsCore;
const actionsGithub = __importStar(require("@actions/github"));
exports.actionsGithub = actionsGithub;
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.fetch = node_fetch_1.default;
