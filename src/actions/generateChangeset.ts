import {actionsCore as core, actionsGithub as github} from '../lib'
import {getRepo} from '../repo'
import {getReleaseNotes} from '../utils'

async function run() {
  try {
    const token = core.getInput('token')
    const fromRef = core.getInput('fromRef')
    const toRef = core.getInput('toRef')
    const tagName = core.getInput('tagName')

    const {owner, repo} = github.context.repo

    const api = getRepo({token, owner, repo})

    const commits = await api.getCommits({base: fromRef, head: toRef})

    const {title, body, date} = getReleaseNotes(owner, repo, commits, tagName)

    core.setOutput('title', title)
    core.setOutput('body', body)
    core.setOutput('date', date)
  } catch (e) {
    if (e instanceof Error) {
      core.setFailed(e.message)
    }
  }
}

run()
