"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("../repo");
const utils_1 = require("../utils");
const fs = require('fs');
const repository = (0, repo_1.getRepo)({
    token: process.env.GITHUB_TOKEN_COM || '',
    owner: 'NicholasBoll',
    repo: 'canvas-kit',
});
async function run() {
    // const response = await repository.getCommits({
    //   head: 'master',
    //   base: '5.2.0',
    // })
    var _a, _b;
    const prData = await repository.getPullRequest(8);
    // fs.writeFileSync('./fixtures/getPullRequestMessage.json', JSON.stringify(prData, null, '  '))
    const data = (0, utils_1.getMergeData)(prData);
    const id = (_b = (_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) === null || _b === void 0 ? void 0 : _b.id;
    const mergeResponse = await repository.enableAutoMerge({
        id,
        ...data,
    });
    console.log(JSON.stringify(mergeResponse, null, '  '));
}
run();
// const query = gql`
//   query HistoryQuery {
//     repository(name: "canvas-kit", owner: "Workday") {
//       ref(qualifiedName: "master") {
//         ... on Commit {
//         }
//       }
//     }
//   }
// `
// const response = repository.graphql<HistoryQuery>(query, {})
