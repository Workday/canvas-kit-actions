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

  core.info(`merge strategy: ${mergeData.mergeMethod}`)
  core.info(`title:\n${mergeData.commitHeadline}`)
  core.info(`body:\n${mergeData.commitBody}`)

  const id = prData.repository?.pullRequest?.id
  if (!id) {
    throw new Error(`Pull request id not found for ${prNumber}`)
  }

  if (prData.repository?.pullRequest?.autoMergeRequest) {
    // There is already an automerge request... We must disable and re-enable because enabling twice does not update the message
    await repo.disableAutoMerge({id})
  }

  try {
    core.info(`Attempting to enable Github's automerge feature.`)
    await repo.enableAutoMerge({
      id,
      ...mergeData,
    })
  } catch (e) {
    if (e instanceof Error) {
      core.info(`Could not enable auto merge. Trying to directly merge.\nMessage: ${e.message}`)
    }

    if (prData.repository?.pullRequest?.mergeable === 'MERGEABLE') {
      // Automerge failed. Try a straight merge
      await repo.merge({
        pullRequestId: id,
        ...mergeData,
      })
    } else {
      // PR is not mergeable
      throw new Error(
        `Pull request is not mergeable. Github mergeability: ${prData.repository?.pullRequest?.mergeable}`,
      )
    }
  }
  core.info(`Enabled Github's automerge feature. Success!`)

  core.setOutput('strategy', mergeData.mergeMethod)
}

run().catch(e => {
  if (e instanceof Error) {
    core.setFailed(e.message)
  }
})
