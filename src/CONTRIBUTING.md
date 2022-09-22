## Summary

This repository contains custom actions from http://github.com/Workday/canvas-kit

## Example

Actions within this repo are invoked by the `uses` keyword in a workflow script. For example: https://github.com/Workday/canvas-kit/blob/bd507e1dce38a8325c0e4eedd45c2987a00a6299/.github/workflows/lint-pull-request.yml#L29

```markdown
- uses: Workday/canvas-kit-actions/verify-pull-request@v1
```

Let's break down what's happening. The `uses` keyword of a GitHub Action targets a real Github repository. The
`Workday/canvas-kit-actions` refers the the repository path. In this example, https://github.com/Workday/canvas-kit-actions. The `@v1` refers to a tag or a branch. In this example, https://github.com/Workday/canvas-kit-actions/tree/v1. The `/verify-pull-request` is a subdirectory within the repository at the branch/tag. In this example, https://github.com/Workday/canvas-kit-actions/tree/v1/verify-pull-request

In this GitHub Action repository, source code is in the `main` branch an `v1` is a pre-compiled branch. The `v1` branch is auto deployed on all changes to the `main` branch via a GitHub Action and deployed using GitHub Pages. The difference between the `main` and `v1` branches is the `v1` has a `dist` directory which is the pre-compiled code for real-world use.

Inside the Github Action referred to by `uses`, there must be an `action.yml` file. Let's check out the `verify-pull-request` action file here: https://github.com/Workday/canvas-kit-actions/blob/main/verify-pull-request/action.yml

```yaml
name: 'Verify Pull Request'
description: 'Verify the pull request title and metadata to ensure correct changeset results'
author: 'Workday'
inputs:
  token:
    required: true
    description: 'A github token with at least read access to the repository'
  pullRequestNumber:
    required: false
    description: 'Optional manual override of a pull request number. Useful for workflow dispatch jobs.'
runs:
  using: 'node12'
  main: '../dist/actions/verifyPullRequest.js'
```

The `runs` block contains the `main` block which points to the source file. To find this file, transpose the `dist` with `src`. For example, here's the source code for this action: https://github.com/Workday/canvas-kit-actions/blob/main/src/actions/verifyPullRequest.ts.

## Navigating code

All actions import from `repo` and `utils`:

- `repo`: Contains all side-effect API calls to the GitHub API or the file system. All API responses are strongly typed using GitHub's rest API or GraphQL and using https://github.com/Quramy/ts-graphql-plugin to generate Typescript types from a GraphQL query. There are no tests for these functions as they only return API calls. Some of the more complex API responses are stored as fixture data in the `fixtures` directory. These fixture JSON files help to understand the returned API calls as well as are used in some tests.
- `utils`: Contains only pure functions to manipulate data or responses from API calls. All functions here are unit tested. Most fixes and code changes can be made here with 100% confidence that the CI will still work. The unit tests also help to understand data flow.

The combination of strong types and unit testing ensures a high degree of confidence in changes without having to test changes via CI runs triggered by real GitHub events in the http://github.com/Workday/canvas-kit repository.
