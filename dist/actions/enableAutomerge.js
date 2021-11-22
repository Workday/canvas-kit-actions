"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const repo_1 = require("../repo");
const utils_1 = require("../utils");
async function run() {
    var _a, _b, _c, _d;
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
    const mergeData = (0, utils_1.getMergeData)(prData);
    const id = (_b = (_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) === null || _b === void 0 ? void 0 : _b.id;
    if (!id) {
        throw new Error(`Pull request id not found for ${prNumber}`);
    }
    if ((_d = (_c = prData.repository) === null || _c === void 0 ? void 0 : _c.pullRequest) === null || _d === void 0 ? void 0 : _d.autoMergeRequest) {
        // There is already an automerge request... We must disable and re-enable because enabling twice does not update the message
        await repo.disableAutoMerge({ id });
    }
    await repo.enableAutoMerge({
        id,
        ...mergeData,
    });
    lib_1.actionsCore.info(`title:\n${mergeData.commitHeadline}`);
    lib_1.actionsCore.info(`body:\n${mergeData.commitBody}`);
    lib_1.actionsCore.setOutput('strategy', mergeData.mergeMethod);
}
run().catch(e => {
    if (e instanceof Error) {
        lib_1.actionsCore.setFailed(e.message);
    }
});
