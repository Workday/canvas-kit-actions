"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const repo_1 = require("../repo");
const utils_1 = require("../utils");
async function run() {
    const token = lib_1.actionsCore.getInput('token');
    const fromRef = lib_1.actionsCore.getInput('fromRef');
    const toRef = lib_1.actionsCore.getInput('toRef');
    const { owner, repo } = lib_1.actionsGithub.context.repo;
    const api = (0, repo_1.getRepo)({ token, owner, repo });
    const commits = await api.getCommits({ base: fromRef, head: toRef });
    const { title, body } = (0, utils_1.getReleaseNotes)(owner, repo, commits);
    lib_1.actionsCore.setOutput('title', title);
    lib_1.actionsCore.setOutput('body', body);
}
run();
