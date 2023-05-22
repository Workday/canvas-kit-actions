import {actionsCore as core, actionsGithub as github} from '../lib'
import {getNextBranch} from '../utils'

async function run() {
  const branch = core.getInput('branch') || github.context.ref.replace('refs/heads/', '')

  core.setOutput('branch', getNextBranch(branch))
}

run().catch(e => {
  if (e instanceof Error) {
    core.setFailed(e.message)
  }
})
