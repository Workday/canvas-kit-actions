import {
  getChangelogEntry,
  getCommitBody,
  getCommitParts,
  getMergeData,
  getReleaseTitle,
  getSections,
  mergeAuthors,
  verifyPullRequest,
} from './utils'
import {stripIndent} from 'common-tags'
import fs from 'fs'
import path from 'path'
import {promisify} from 'util'
import {GetPullRequest} from './__generated__/get-pull-request'

const readFile = promisify(fs.readFile)

function createTestPullRequest(input: {
  pullRequest: Partial<NonNullable<GetPullRequest['repository']>['pullRequest']>
}): GetPullRequest {
  return {
    repository: {
      pullRequest: {
        id: '',
        baseRefName: '',
        headRefName: '',
        body: '',
        number: 1,
        mergeable: 'MERGEABLE',
        title: '',
        autoMergeRequest: {
          commitBody: '',
          commitHeadline: '',
          enabledAt: '',
        },
        author: {
          login: '',
        },
        commits: {
          totalCount: 0,
          nodes: null,
        },
        ...input?.pullRequest,
      },
    },
  }
}

describe('utils', () => {
  describe('getCommitBody', () => {
    it('should format the commit message', () => {
      const input = {
        summary: 'My summary',
        'release category': 'Components',
        'release note': 'My release notes',
        'breaking changes': 'Some breaking changes',
      }

      const expected = stripIndent`
      My summary

      [category:Components]

      Release Note:
      My release notes

      ### BREAKING CHANGES
      Some breaking changes
      `

      expect(getCommitBody(input)).toEqual(expected)
    })
  })

  describe('mergeAuthors', () => {
    it('should merge authors by name', () => {
      const actual = mergeAuthors([
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          login: null,
        },
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          login: null,
        },
        {
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          login: null,
        },
      ])

      const expected = [
        {name: 'John Doe', email: 'john.doe@example.com', login: null},
        {name: 'Jane Doe', email: 'jane.doe@example.com', login: null},
      ]

      expect(actual).toEqual(expected)
    })

    it('should merge authors by name preferring defined login fields', () => {
      const actual = mergeAuthors([
        {
          name: 'John Doe',
          email: 'john.doe1@example.com',
          login: null,
        },
        {
          name: 'John Doe',
          email: 'john.doe2@example.com',
          login: 'JohnDoe',
        },
      ])

      const expected = [{name: 'John Doe', email: 'john.doe2@example.com', login: 'JohnDoe'}]

      expect(actual).toEqual(expected)
    })
  })

  describe('getMergeData', () => {
    it('should return a merge strategy with a merge headRefName', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'merge/support/v4-into-master',
            baseRefName: '',
            title: 'Merge support/v4.x into master',
            body: '',
            number: 1240,
            id: '',
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty('mergeMethod', 'MERGE')
    })

    it('should return a squash strategy with a normal headRefName', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'feat/add-rtl',
            baseRefName: '',
            title: 'feat(tooltip): Add RTL support',
            body: '',
            number: 1240,
            id: '',
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty('mergeMethod', 'SQUASH')
    })

    it('should return the title with a merge headRefName', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'merge/support/v4-into-master',
            baseRefName: '',
            title: 'chore: Merge support/v4.x into master',
            body: '',
            number: 1240,
            id: '',
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty(
        'commitHeadline',
        'chore: Merge support/v4.x into master (#1240)',
      )
    })

    it('should return the formatted title with a normal headRefName', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'chore/fix-overflow-tooltips',
            baseRefName: '',
            title: 'fix(tooltip): Fix OverflowTooltip with SVG icons in IE11',
            body: '',
            number: 1240,
            id: '',
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty(
        'commitHeadline',
        'fix(tooltip): Fix OverflowTooltip with SVG icons in IE11 (#1240)',
      )
    })

    it('should add the breaking indicator to the title for breaking changes', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'chore/fix-overflow-tooltips',
            baseRefName: '',
            title: 'fix(tooltip): Fix OverflowTooltip with SVG icons in IE11',
            body: stripIndent`
            ### BREAKING CHANGES
            Some breaking changes
            `,
            number: 1240,
            id: '',
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty(
        'commitHeadline',
        'fix(tooltip)!: Fix OverflowTooltip with SVG icons in IE11 (#1240)',
      )
    })

    it('should create a category of [category:Dependencies] from dependabot PRs', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'dependabot/npm_and_yarn/ajv-6.12.6',
            baseRefName: '',
            title: 'chore: Bump ajv from 6.12.0 to 6.12.6',
            body: stripIndent`
              Bumps [ajv](https://github.com/ajv-validator/ajv) from 6.12.0 to 6.12.6.
              <details>
              <summary>Release notes</summary>
              ...
            `,
            number: 1240,
            id: '',
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty(
        'commitHeadline',
        'chore: Bump ajv from 6.12.0 to 6.12.6 (#1240)',
      )

      expect(expected).toHaveProperty(
        'commitBody',
        stripIndent`
          Bumps [ajv](https://github.com/ajv-validator/ajv) from 6.12.0 to 6.12.6.

          [category:Dependencies]
        `,
      )
    })

    it('should add co-authors if more than author is detected', () => {
      const expected = getMergeData(
        createTestPullRequest({
          pullRequest: {
            headRefName: 'feat/add-something',
            baseRefName: 'master',
            title: 'feat: Add new component',
            body: stripIndent`
              ## Summary
              Add a new Component

              ## Release Category
              Components
            `,
            number: 1240,
            id: '',
            author: {
              login: 'janesmith',
            },
            commits: {
              totalCount: 2,
              nodes: [
                {
                  commit: {
                    additions: 1,
                    deletions: 1,
                    message: 'Fix a typo',
                    authoredByCommitter: true,
                    authors: {
                      nodes: [
                        {
                          name: 'John Doe',
                          email: 'john.doe@example.com',
                          user: null,
                        },
                      ],
                    },
                  },
                },
                {
                  commit: {
                    additions: 1,
                    deletions: 1,
                    message: 'Fix a typo',
                    authoredByCommitter: true,
                    authors: {
                      nodes: [
                        {
                          name: 'John Doe',
                          email: 'john.doe@example.com',
                          user: {
                            login: 'JohnDoe',
                          },
                        },
                        {
                          name: 'Jane Doe',
                          email: 'jane.doe@example.com',
                          user: {
                            login: 'JaneDoe',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
            mergeable: 'MERGEABLE',
            autoMergeRequest: null,
          },
        }),
      )

      expect(expected).toHaveProperty(
        'commitBody',
        stripIndent`
          Add a new Component

          [category:Components]

          Co-authored-by: @JohnDoe <john.doe@example.com>
          Co-authored-by: @JaneDoe <jane.doe@example.com>
        `,
      )
    })
  })

  describe('getSections', () => {
    it('should parse headings into sections', () => {
      const input = stripIndent`
      ## Summary
      My summary

      ## Release Category
      Components

      ## Release Note
      My release notes

      ### BREAKING CHANGES
      Some breaking changes
      `

      const expected = {
        summary: 'My summary',
        'release category': 'Components',
        'release note': 'My release notes',
        'breaking changes': 'Some breaking changes',
      }

      expect(getSections(input)).toEqual(expected)
    })

    it('should parse headings and a category shield', () => {
      const input = stripIndent`
      ## Summary
      My summary

      ![category](https://img.shields.io/badge/release_category-Components-blue)

      ## Release Note
      My release notes

      ### BREAKING CHANGES
      Some breaking changes
      `

      const expected = {
        summary: 'My summary',
        'release category': 'Components',
        'release note': 'My release notes',
        'breaking changes': 'Some breaking changes',
      }

      expect(getSections(input)).toEqual(expected)
    })

    it('should parse dependabot pull requests', () => {
      const input = stripIndent`
      Bumps [prismjs](https://github.com/PrismJS/prism) from 1.25.0 to 1.27.0.
      <details>
      <summary>Release notes</summary>
      <p><em>Sourced from <a href="https://github.com/PrismJS/prism/releases">prismjs's releases</a>.</em></p>
      <blockquote>
      <h2>v1.27.0</h2>
      <p>Release 1.27.0</p>
      <h2>v1.26.0</h2>
      <p>Release 1.26.0</p>
      </blockquote>
      </details>

      [![Dependabot compatibility score](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=prismjs&package-manager=npm_and_yarn&previous-version=1.25.0&new-version=1.27.0)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)

      Dependabot will resolve any conflicts with this PR as long as you don't alter it yourself. You can also trigger a rebase manually by commenting \`@dependabot rebase\`.

      [//]: # (dependabot-automerge-start)
      [//]: # (dependabot-automerge-end)

      ---

      <details>
      <summary>Dependabot commands and options</summary>
      <br />
      You can disable automated security fix PRs for this repo from the [Security Alerts page](https://github.com/Workday/canvas-kit/network/alerts).
      </details>
      `

      const expected = {
        summary: 'Bumps [prismjs](https://github.com/PrismJS/prism) from 1.25.0 to 1.27.0.',
        'release category': 'Dependencies',
      }

      expect(getSections(input)).toEqual(expected)
    })
  })

  describe('getCommitParts', () => {
    // it('should leave the ')
    it('should extract the parts of a commit message', () => {
      const input = stripIndent`
      feat(tooltip): Fix OverflowTooltip with SVG icons in IE11 (#1234)

      My summary

      [category:Components]

      Release Note:
      My release notes

      ### BREAKING CHANGES
      Some breaking changes

      Co-authored-by: @JohnDoe <john.doe@example.com>
      Co-authored-by: Jane Doe <jane.doe@example.com>
      `

      const expected = {
        title: 'feat(tooltip): Fix OverflowTooltip with SVG icons in IE11',
        pull_request: '1234',
        category: 'Components',
        'release note': 'My release notes',
        'breaking change': 'Some breaking changes',
        additionalAuthors: ['@JohnDoe', 'Jane Doe'],
      }

      expect(getCommitParts(input)).toEqual(expected)
    })

    it('should remove the breaking indicator from the title', () => {
      const input = stripIndent`
      feat(tooltip)!: Fix OverflowTooltip with SVG icons in IE11 (#1234)
      `

      const expected = {
        title: 'feat(tooltip): Fix OverflowTooltip with SVG icons in IE11',
        pull_request: '1234',
        category: 'Components',
      }

      expect(getCommitParts(input)).toEqual(expected)
    })

    it('should guess that "ci:" is infrastructure', () => {
      const input = stripIndent`
      ci: Upgrade to Github Actions (#1234)

      My summary
      `

      const expected = {
        title: 'ci: Upgrade to Github Actions',
        pull_request: '1234',
        category: 'Infrastructure',
      }

      expect(getCommitParts(input)).toEqual(expected)
    })
  })

  describe('verifyPullRequest', () => {
    it('should pass when headRef is a merge', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: '',
          title: '',
          author: {
            login: '',
          },
          number: 0,
          headRefName: 'merge/support-into-master',
          baseRefName: '',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should fail when there is no PR body', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: '',
          title: '',
          number: 0,
          headRefName: '',
          baseRefName: '',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain('No pull request body found')
    })

    it('should fail when there is no Summary section', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content',
          title: '',
          number: 0,
          headRefName: '',
          baseRefName: '',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain('No Summary section provided')
    })

    it('should fail when there is no Category section', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary',
          title: '',
          number: 0,
          headRefName: '',
          baseRefName: '',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain('No Category section provided')
    })

    it('should fail if a feature is included and base branch is support', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
          title: 'feat(tooltip): Some new Tooltip feature',
          number: 0,
          headRefName: '',
          baseRefName: 'support',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain('The support branch should only contain fixes')
    })

    it('should fail if a feature is included and base branch is master', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
          title: 'feat(tooltip): Some new Tooltip feature',
          number: 0,
          headRefName: '',
          baseRefName: 'master',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain('The master branch should only contain fixes')
    })

    it('should fail if a breaking change is included and base branch is not the prerelease/major branch', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents\n## BREAKING CHANGES\nSome breaking change',
          title: 'fix(tooltip): Some breaking tooltip fix',
          number: 0,
          headRefName: '',
          baseRefName: 'master',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain(
        'All breaking changes should target the "prerelease/major" branch',
      )
    })

    it('should not fail if a feature is included and base branch is prerelease/minor', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
          title: 'feat(tooltip): Some new Tooltip feature',
          number: 0,
          headRefName: '',
          baseRefName: 'prerelease/minor',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should not fail if a feature is included and base branch is prerelease/major', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
          title: 'feat(tooltip): Some new Tooltip feature',
          number: 0,
          headRefName: '',
          baseRefName: 'prerelease/major',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should not fail if a breaking change is included and prerelease/major', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents\n## BREAKING CHANGES\nSome breaking change',
          title: 'fix(tooltip): Some breaking tooltip fix',
          number: 0,
          headRefName: '',
          baseRefName: 'prerelease/major',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should fail if [skip ci] is detected in the PR title', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents\n## BREAKING CHANGES\nSome breaking change',
          title: 'fix(tooltip): Some breaking tooltip fix [skip ci]',
          number: 0,
          headRefName: '',
          baseRefName: 'prerelease/minor',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toContain('Do not use [skip ci]')
    })

    it('should not fail when all requirements are met', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
          title: '',
          number: 0,
          headRefName: '',
          baseRefName: '',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should not fail on dependabot PRs', () => {
      const input: GetPullRequest = createTestPullRequest({
        pullRequest: {
          body: 'Bumps [ajv](https://github.com/ajv-validator/ajv) from 6.12.0 to 6.12.6.\n<details>\n<summary>Release notes</summary>',
          title: 'chore: Bump ajv from 6.12.0 to 6.12.6',
          number: 0,
          headRefName: 'dependabot/npm_and_yarn/ajv-6.12.6',
          baseRefName: '',
          id: '',
          mergeable: 'MERGEABLE',
          autoMergeRequest: null,
        },
      })

      expect(verifyPullRequest(input)).toEqual(false)
    })
  })

  describe('getChangelogEntry', () => {
    it('should create release notes from commit data', async () => {
      // use fixture data because the amount of data is so large. This test might be
      // hard to debug, but the Jest equality diff should help
      const getCommitsData = JSON.parse(
        (await readFile(path.resolve(__dirname, '../fixtures/getCommits.json'))).toString(),
      )
      const releaseExample = (
        await readFile(path.resolve(__dirname, '../fixtures/releaseExample.md'))
      )
        .toString()
        .trim() // trim to remove issue with autoformatting

      jest.useFakeTimers('modern').setSystemTime(new Date('2021-09-05'))
      const expected = getChangelogEntry('Workday', 'canvas-kit', getCommitsData.commits, 'v5.2.0')

      expect(expected).toEqual(releaseExample)
    })
  })

  describe('getReleaseTitle', () => {
    it('should create a release title', () => {
      jest.useFakeTimers('modern').setSystemTime(new Date('2021-09-05'))
      const expected = getReleaseTitle('Workday', 'canvas-kit', 'v5.2.0')

      expect(expected).toEqual(
        '## [v5.2.0](https://github.com/Workday/canvas-kit/releases/tag/v5.2.0) (2021-09-05)',
      )
    })
  })
})
