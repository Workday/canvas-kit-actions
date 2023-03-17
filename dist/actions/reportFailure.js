"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
async function run() {
    const slackWebhook = lib_1.actionsCore.getInput('slackWebhook');
    const slackMessage = lib_1.actionsCore.getInput('slackMessage');
    const { ref, runId, repo, serverUrl } = lib_1.actionsGithub.context;
    const branch = ref.replace('/refs/heads/', '');
    await (0, lib_1.fetch)(slackWebhook, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            attachments: [
                {
                    fallback: `Build Failure on '${branch}'`,
                    color: 'danger',
                    title: `Build Failure on '${branch}'`,
                    title_link: `${serverUrl}/${repo}/actions/runs/${runId}`,
                    text: `${slackMessage}\n`,
                    ts: Date.now(),
                },
            ],
        }),
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
        }
    });
}
run().catch(e => {
    if (e instanceof Error) {
        lib_1.actionsCore.setFailed(e.message);
    }
});
