import {actionsCore as core, actionsGithub as github} from '../lib'
import {getRepo} from '../repo'
import {verifyPullRequest} from '../utils'

async function run() {
  try {
    const token = core.getInput('token')
    const repo = getRepo({token, ...github.context.repo})

    const pull_request = github.context.payload.pull_request
    if (!pull_request) {
      throw new Error(
        'This action can only be invoked in `pull_request_target` or `pull_request` events. There is no pull request context to run against.',
      )
    }

    const prData = await repo.getPullRequestMessage(pull_request.number)

    const error = verifyPullRequest(prData)
    if (error) {
      throw new Error(error)
    }
  } catch (e) {
    if (e instanceof Error) {
      core.setFailed(e.message)
    }
  }
}

run()
