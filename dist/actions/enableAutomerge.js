"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const repo_1 = require("../repo");
const utils_1 = require("../utils");
async function run() {
    var _a, _b;
    // const token = core.getInput('token')
    // const number = core.getInput('number')
    // const repo = getRepo({token, ...github.context.repo})
    const repo = (0, repo_1.getRepo)({
        token: process.env.GITHUB_TOKEN_COM || '',
        owner: 'NicholasBoll',
        repo: 'canvas-kit',
    });
    const number = undefined;
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
    await repo.enableAutoMerge({
        id,
        ...mergeData,
    });
    lib_1.actionsCore.setOutput('strategy', mergeData.mergeMethod);
}
run().catch(e => {
    if (e instanceof Error) {
        lib_1.actionsCore.setFailed(e.message);
    }
});
