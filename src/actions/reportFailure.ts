import {actionsCore as core, actionsGithub as github, fetch} from '../lib'

async function run() {
  const slackWebhook = core.getInput('slackWebhook')
  const slackMessage = core.getInput('slackMessage')
  const {ref, runId, repo, serverUrl} = github.context

  const branch = ref.replace('refs/heads/', '')

  await fetch(slackWebhook, {
    method: 'post',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      attachments: [
        {
          fallback: `Build Failure on branch '${branch}'`,
          color: 'danger',
          title: `Build Failure on branch '${branch}'`,
          title_link: `${serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${runId}`,
          text: `${slackMessage}\n`,
          ts: Date.now(),
        },
      ],
    }),
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
    }
  })
}

run().catch(e => {
  if (e instanceof Error) {
    core.setFailed(e.message)
  }
})
