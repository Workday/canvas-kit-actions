"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const utils_1 = require("../utils");
async function run() {
    const branch = lib_1.actionsCore.getInput('branch') || lib_1.actionsGithub.context.ref.replace('refs/heads/', '');
    lib_1.actionsCore.setOutput('branch', (0, utils_1.getNextBranch)(branch));
}
run().catch(e => {
    if (e instanceof Error) {
        lib_1.actionsCore.setFailed(e.message);
    }
});
