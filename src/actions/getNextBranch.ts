import {actionsCore as core, actionsGithub as github} from '../lib'
import {getNextBranch} from '../utils'

async function run() {
  const mainBranch = core.getInput('mainBranch') || 'master'
  const branch = core.getInput('branch') || github.context.ref.replace('refs/heads/', '')

  core.setOutput('branch', getNextBranch(branch, mainBranch))
}

run().catch(e => {
  if (e instanceof Error) {
    core.setFailed(e.message)
  }
})
