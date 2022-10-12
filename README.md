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
