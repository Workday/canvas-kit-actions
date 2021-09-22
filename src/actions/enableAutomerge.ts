import {actionsCore as core, actionsGithub as github} from '../lib'
import {getRepo} from '../repo'
import {getMergeData} from '../utils'

async function run() {
  const token = core.getInput('token')
  const number = core.getInput('number')
  const repo = getRepo({token, ...github.context.repo})

  let prNumber: number

  if (number) {
    prNumber = Number(number)
  } else {
    const pull_request = github.context.payload.pull_request
    if (!pull_request) {
      throw new Error(
        'This action can only be invoked in `pull_request_target` or `pull_request` events. There is no pull request context to run against. Try using one of these events or provide a `pullRequestNumber`',
      )
    }
    prNumber = pull_request.number
  }

  const prData = await repo.getPullRequest(prNumber)
  const mergeData = getMergeData(prData)
  const id = prData.repository?.pullRequest?.id
  if (!id) {
    throw new Error(`Pull request id not found for ${prNumber}`)
  }

  if (prData.repository?.pullRequest?.autoMergeRequest) {
    // There is already an automerge request... We must disable and re-enable because enabling twice does not update the message
    await repo.disableAutoMerge({id})
  }

  await repo.enableAutoMerge({
    id,
    ...mergeData,
  })

  core.setOutput('strategy', mergeData.mergeMethod)
}

run().catch(e => {
  if (e instanceof Error) {
    core.setFailed(e.message)
  }
})
