"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const repo_1 = require("../repo");
async function run() {
    var _a, _b, _c;
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
    const relatedIssues = ((_c = (_b = (_a = (await repo.getRelatedIssues(prNumber)).repository) === null || _a === void 0 ? void 0 : _a.pullRequest) === null || _b === void 0 ? void 0 : _b.closingIssuesReferences) === null || _c === void 0 ? void 0 : _c.nodes) || [];
    lib_1.actionsCore.info(`Found ${relatedIssues.length} related issue(s)`);
    for (const issue of relatedIssues) {
        if (issue) {
            lib_1.actionsCore.info(`Closing ${issue.title} (#${issue.number})`);
            await repo.closeIssue(issue.id);
        }
    }
}
run().catch(e => {
    if (e instanceof Error) {
        lib_1.actionsCore.setFailed(e.message);
    }
});
