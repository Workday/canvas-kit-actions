"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const repo_1 = require("../repo");
const utils_1 = require("../utils");
async function run() {
    try {
        const token = lib_1.actionsCore.getInput('token');
        const number = lib_1.actionsCore.getInput('number');
        const repo = (0, repo_1.getRepo)({ token, ...lib_1.actionsGithub.context.repo });
        let prNumber;
        if (number) {
            prNumber = Number(number);
        }
        else {
            const pull_request = lib_1.actionsGithub.context.payload.pull_request;
            if (!pull_request) {
                throw new Error('This action can only be invoked in `pull_request_target` or `pull_request` events. There is no pull request context to run against. Try using one of these events or provide a `pullRequestNumber`');
            }
            prNumber = pull_request.number;
        }
        const prData = await repo.getPullRequest(prNumber);
        const error = (0, utils_1.verifyPullRequest)(prData);
        if (error) {
            throw new Error(error);
        }
    }
    catch (e) {
        if (e instanceof Error) {
            lib_1.actionsCore.setFailed(e.message);
        }
    }
}
run();
