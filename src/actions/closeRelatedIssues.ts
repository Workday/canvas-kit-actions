import {actionsCore as core, actionsGithub as github} from '../lib'
import {getRepo} from '../repo'

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

  const relatedIssues =
    (await repo.getRelatedIssues(prNumber)).repository?.pullRequest?.closingIssuesReferences
      ?.nodes || []

  core.info(`Found ${relatedIssues.length} related issue(s)`)

  for (const issue of relatedIssues) {
    if (issue) {
      core.info(`Closing ${issue.title} (#${issue.number})`)
      await repo.closeIssue(issue.id)
    }
  }
}

run().catch(e => {
  if (e instanceof Error) {
    core.setFailed(e.message)
  }
})
