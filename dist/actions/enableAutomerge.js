"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const repo_1 = require("../repo");
const utils_1 = require("../utils");
async function run() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
    lib_1.actionsCore.info(`merge strategy: ${mergeData.mergeMethod}`);
    lib_1.actionsCore.info(`title:\n${mergeData.commitHeadline}`);
    lib_1.actionsCore.info(`body:\n${mergeData.commitBody}`);
    const id = (_b = (_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) === null || _b === void 0 ? void 0 : _b.id;
    if (!id) {
        throw new Error(`Pull request id not found for ${prNumber}`);
    }
    if ((_d = (_c = prData.repository) === null || _c === void 0 ? void 0 : _c.pullRequest) === null || _d === void 0 ? void 0 : _d.autoMergeRequest) {
        // There is already an automerge request... We must disable and re-enable because enabling twice does not update the message
        await repo.disableAutoMerge({ id });
    }
    try {
        lib_1.actionsCore.info(`Attempting to enable Github's automerge feature.`);
        await repo.enableAutoMerge({
            id,
            ...mergeData,
        });
    }
    catch (e) {
        lib_1.actionsCore.info(`Could not enable auto merge. Trying to directly merge.`);
        lib_1.actionsCore.info(`Mergeable state: ${(_f = (_e = prData.repository) === null || _e === void 0 ? void 0 : _e.pullRequest) === null || _f === void 0 ? void 0 : _f.mergeStateStatus}`);
        if (e instanceof Error) {
            lib_1.actionsCore.info(`\nMessage: ${e.message}`);
        }
        else if (typeof e === 'string') {
            lib_1.actionsCore.info(`\nMessage: ${e}`);
        }
        if (((_h = (_g = prData.repository) === null || _g === void 0 ? void 0 : _g.pullRequest) === null || _h === void 0 ? void 0 : _h.mergeable) === 'MERGEABLE' &&
            prData.repository.pullRequest.mergeStateStatus === 'CLEAN') {
            // Automerge failed. Try a straight merge
            await repo.merge({
                pullRequestId: id,
                ...mergeData,
            });
        }
        else {
            // PR is not mergeable
            throw new Error(`Pull request is not mergeable. Github mergeability: ${(_k = (_j = prData.repository) === null || _j === void 0 ? void 0 : _j.pullRequest) === null || _k === void 0 ? void 0 : _k.mergeable}. Github Merge status: ${(_m = (_l = prData.repository) === null || _l === void 0 ? void 0 : _l.pullRequest) === null || _m === void 0 ? void 0 : _m.mergeStateStatus}`);
        }
    }
    lib_1.actionsCore.info(`Enabled Github's automerge feature. Success!`);
    lib_1.actionsCore.setOutput('strategy', mergeData.mergeMethod);
}
run().catch(e => {
    if (e instanceof Error) {
        lib_1.actionsCore.setFailed(e.message);
    }
});
