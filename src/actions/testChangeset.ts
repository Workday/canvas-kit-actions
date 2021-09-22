import {getRepo} from '../repo'
import {getMergeData} from '../utils'
const fs = require('fs')

const repository = getRepo({
  token: process.env.GITHUB_TOKEN_COM || '',
  owner: 'NicholasBoll',
  repo: 'canvas-kit',
})

async function run() {
  // const response = await repository.getCommits({
  //   head: 'master',
  //   base: '5.2.0',
  // })

  const prData = await repository.getPullRequest(8)

  // fs.writeFileSync('./fixtures/getPullRequestMessage.json', JSON.stringify(prData, null, '  '))
  const data = getMergeData(prData)
  const id = prData.repository?.pullRequest?.id!

  const mergeResponse = await repository.enableAutoMerge({
    id,
    ...data,
  })

  console.log(JSON.stringify(mergeResponse, null, '  '))
}

run()
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
