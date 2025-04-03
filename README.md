## Canvas Kit Actions

This repository contains custom Github Actions that aid in the release process of https://github.com/Workday/canvas-kit. This is a monorepo of multiple actions.

### `verify-pull-request`

This action runs the following checks:

- **Ensure the base/target branch is correct.**
  Canvas Kit release patch versions on every commit, but minor and major releases on a cadence. In order to support this workflow, prerelease branches are used. If a pull request contains a feature, it must target a prerelease branch. Breaking changes also should only go into prerelease branches
- **Ensure a Summary section is present**
  A Summary is used for the extended commit message and should contain `Fixes` or `Resovles` pointing to an issue number and a short description of the motivation of a pull request.

Failure of these checks will display an error message describing what check failed. This action can only be run in the context of a `pull_request` or `pull_request_target` event as a PR number is needed.

#### Example

```yml
- uses: Workday/canvas-kit-actions/generate-changeset@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }} # needs read access
```

### `generate-changeset`

Given a `fromRef`, a `toRef`, and a `tagName`, this action will perform a comparison between the `fromRef` and the `toRef` and create a changeset from commits in this range. A `title` and `body` will be returned as outputs for use in updating a CHANGELOG and creating releases. This action does not change or access the workspace though.

#### Example

```yml
- uses: Workday/canvas-kit-actions/generate-changeset@v1
  id: generate-changeset
  with:
    token: ${{ secrets.GITHUB_TOKEN }} # needs read access
    fromRef: v5.1.0 # Could be determined by version field of `package.json` or `lerna.json`
    toRef: master # Branch the workflow file is operating on
    tagName: v5.2.0 # New tag name. Most likely determined using semantic release or conventional commits

- name: Echo output
  run: echo "${{steps.generate-changeset.outputs.title}} ${{steps.generate-changeset.outputs.body}}"
```

### `close-related-issues`

#### Example

```yml
name: Close Linked Issues

on:
  pull_request_target:
    types: [closed]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: Workday/canvas-kit-actions/close-related-issues@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### `report-failure`

Creates a failure message in Slack given a webhook URL and a message.

#### Example

```yml
jobs:
  main:
    runs-on: ubuntu-latest

    steps:
      - uses: Workday/canvas-kit-actions/report-failure@v1
        if: failure()
        with:
          slackWebhook: ${{ secrets.SLACK_WEBHOOK }}
          slackMessage: |
            Release job failed. Please check error logs.
```

### `release`

Makes release based on given version or patch as default.

#### Example

```yml
jobs:
  main:
    runs-on: ubuntu-latest

    steps:
      - uses: Workday/canvas-kit-actions/release@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          gh_rw_token: ${{ secrets.GH_RW_TOKEN }}
          publish_token: ${{ secrets.NPM_CI_PUBLISH_TOKEN }}
          chromatic_project_token: ${{ secrets.CHROMATIC_APP_CODE }}
          version: 'minor'
```

### Do Release Action

#### Purpose

This GitHub Action automates the release or prerelease process, supporting version bumping, changelog attachment, and publishing. It integrates with **changeset** by default but can be modified to work with other tools.

#### Inputs

| Input Name            | Required | Default                 | Description                                                                                                                                                                     |
| --------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildScript`         | ❌ No    | `yarn build`            | Command to build the package before release. Defaults to `yarn build`.                                                                                                          |
| `changelog`           | ❌ No    | `""`                    | Text for the changelog to include in the release.                                                                                                                               |
| `commitScript`        | ❌ No    | N/A                     | Command to commit version changes and changelog updates. If not provided commit will be released with the next message: `"chore: Release <package> v<version> [skip release]"`' |
| `ghToken`             | ✅ Yes   | N/A                     | GitHub token with read/write permissions for release operations.                                                                                                                |
| `package`             | ✅ Yes   | N/A                     | The package name for correct versioning.                                                                                                                                        |
| `packagePath`         | ✅ Yes   | N/A                     | Path to the package folder.                                                                                                                                                     |
| `preid`               | ❌ No    | N/A                     | Identifier for a prerelease version (e.g., `beta`, `rc`). Required if `prerelease` is `true`.                                                                                   |
| `prerelease`          | ❌ No    | `false`                 | Flag to indicate a prerelease. If `true`, `preid` must be provided.                                                                                                             |
| `releaseScript`       | ❌ No    | `npx changeset publish` | Command to publish the package. Defaults to `npx changeset publish`.                                                                                                            |
| `releasePrivate`      | ❌ No    | `true`                  | Temporarily makes private packages public for release and then restores privacy.                                                                                                |
| `skipCreateChangelog` | ❌ No    | N/A                     | If `true`, changelog creation is skipped.                                                                                                                                       |
| `skipCreateTag`       | ❌ No    | `true`                  | If `true`, the git tag creation (`package@version`) is skipped.                                                                                                                 |
| `skipGithubRelease`   | ❌ No    | N/A                     | If `true`, skips creating a GitHub release.                                                                                                                                     |
| `skipPush`            | ❌ No    | N/A                     | If `true`, skips pushing commits and tags to the origin branch.                                                                                                                 |
| `skipTagsPush`        | ❌ No    | N/A                     | If `true`, skips pushing git tags to the origin branch.                                                                                                                         |
| `version`             | ✅ Yes   | N/A                     | Specifies the version type: `patch`, `minor`, or `major`.                                                                                                                       |
| `versionScript`       | ❌ No    | `npx changeset version` | Command to bump the version of the package. Defaults to `npx changeset version`.                                                                                                |

#### Outputs

| Output Name       | Description                  |
| ----------------- | ---------------------------- |
| `releasedVersion` | The released version number. |

#### Usage

**Standard Release**

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Release package
        uses: Workday/canvas-kit-actions/do-release@v1
        with:
          ghToken: ${{ secrets.GITHUB_TOKEN }}
          version: 'minor'
          package: 'my-package'
          packagePath: 'packages/my-package'
          buildScript: 'yarn build'
          commitScript: 'git commit -am "chore: Release minor version"'
          releaseScript: 'yarn release'
          versionScript: 'npx changeset version'
          skipCreateTag: true
          skipGheRelease: true
```

**Prerelease (Beta)**

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Beta Release
        uses: Workday/canvas-kit-actions/do-release@v1
        with:
          ghToken: ${{ secrets.GITHUB_TOKEN }}
          version: 'minor'
          package: 'my-package'
          packagePath: 'packages/my-package'
          prerelease: true
          preid: 'beta'
          buildScript: 'yarn build'
          commitScript: 'git commit -am "chore: Release beta version"'
          releaseScript: 'yarn release'
          versionScript: 'npx changeset version'
          skipGheRelease: true
```

#### Notes

- Ensure `ghToken` has **read/write** permissions to perform release operations.
- The action supports both **standard releases** and **prereleases**. When `prerelease` is set to `true`, a `preid` and `version` (e.g., `beta`, `rc`) are required.
- Default scripts use **changeset** commands, but they can be overridden to fit different workflows.
- If using **npm** instead of **yarn**, update the `buildScript` accordingly (e.g., `npm run build`).
- Tags are created in the format: `package@version` unless `skipCreateTag` is set to `true`.
