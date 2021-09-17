"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("../repo");
const fs = require('fs');
const repository = (0, repo_1.getRepo)({
    token: process.env.GITHUB_TOKEN_COM || '',
    owner: 'Workday',
    repo: 'canvas-kit',
});
async function run() {
    const response = await repository.getCommits({
        head: 'master',
        base: '5.2.0',
    });
    // const response = await repository.getPullRequestMessage(1268)
    fs.writeFileSync('./fixtures/getCommits2.json', JSON.stringify(response, null, '  '));
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
