import {
  getChangelogEntry,
  getCommitBody,
  getCommitParts,
  getMergeData,
  getReleaseTitle,
  getSections,
  verifyPullRequest,
} from './utils'
import {stripIndent} from 'common-tags'
import fs from 'fs'
import path from 'path'
import {promisify} from 'util'

const readFile = promisify(fs.readFile)

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

  describe('getMergeData', () => {
    it('should return a merge strategy with a merge headRefName', () => {
      const expected = getMergeData({
        repository: {
          pullRequest: {
            headRefName: 'merge/support/v4-into-master',
            baseRefName: '',
            title: 'Merge support/v4.x into master',
            body: '',
            number: 1240,
            id: '',
            autoMergeRequest: null,
          },
        },
      })

      expect(expected).toHaveProperty('mergeMethod', 'MERGE')
    })

    it('should return a squash strategy with a normal headRefName', () => {
      const expected = getMergeData({
        repository: {
          pullRequest: {
            headRefName: 'feat/add-rtl',
            baseRefName: '',
            title: 'feat(tooltip): Add RTL support',
            body: '',
            number: 1240,
            id: '',
            autoMergeRequest: null,
          },
        },
      })

      expect(expected).toHaveProperty('mergeMethod', 'SQUASH')
    })

    it('should return the title with a merge headRefName', () => {
      const expected = getMergeData({
        repository: {
          pullRequest: {
            headRefName: 'merge/support/v4-into-master',
            baseRefName: '',
            title: 'chore: Merge support/v4.x into master',
            body: '',
            number: 1240,
            id: '',
            autoMergeRequest: null,
          },
        },
      })

      expect(expected).toHaveProperty(
        'commitHeadline',
        'chore: Merge support/v4.x into master (#1240)',
      )
    })

    it('should return the formatted title with a normal headRefName', () => {
      const expected = getMergeData({
        repository: {
          pullRequest: {
            headRefName: 'chore/fix-overflow-tooltips',
            baseRefName: '',
            title: 'fix(tooltip): Fix OverflowTooltip with SVG icons in IE11',
            body: '',
            number: 1240,
            id: '',
            autoMergeRequest: null,
          },
        },
      })

      expect(expected).toHaveProperty(
        'commitHeadline',
        'fix(tooltip): Fix OverflowTooltip with SVG icons in IE11 (#1240)',
      )
    })

    it('should add the breaking indicator to the title for breaking changes', () => {
      const expected = getMergeData({
        repository: {
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
            autoMergeRequest: null,
          },
        },
      })

      expect(expected).toHaveProperty(
        'commitHeadline',
        'fix(tooltip)!: Fix OverflowTooltip with SVG icons in IE11 (#1240)',
      )
    })

    it('should create a category of [category:Dependencies] from dependabot PRs', () => {
      const expected = getMergeData({
        repository: {
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
            autoMergeRequest: null,
          },
        },
      })

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
      `

      const expected = {
        title: 'feat(tooltip): Fix OverflowTooltip with SVG icons in IE11',
        pull_request: '1234',
        category: 'Components',
        'release note': 'My release notes',
        'breaking change': 'Some breaking changes',
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
      const input = {
        repository: {
          pullRequest: {
            body: '',
            title: '',
            number: 0,
            headRefName: 'merge/support-into-master',
            baseRefName: '',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should fail when there is no PR body', () => {
      const input = {
        repository: {
          pullRequest: {
            body: '',
            title: '',
            number: 0,
            headRefName: '',
            baseRefName: '',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain('No pull request body found')
    })

    it('should fail when there is no Summary section', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content',
            title: '',
            number: 0,
            headRefName: '',
            baseRefName: '',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain('No Summary section provided')
    })

    it('should fail when there is no Category section', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary',
            title: '',
            number: 0,
            headRefName: '',
            baseRefName: '',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain('No Category section provided')
    })

    it('should fail if a feature is included and base branch is support', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
            title: 'feat(tooltip): Some new Tooltip feature',
            number: 0,
            headRefName: '',
            baseRefName: 'support',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain('The support branch should only contain fixes')
    })

    it('should fail if a feature is included and base branch is master', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
            title: 'feat(tooltip): Some new Tooltip feature',
            number: 0,
            headRefName: '',
            baseRefName: 'master',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain('The master branch should only contain fixes')
    })

    it('should fail if a breaking change is included and base branch is not the prerelease/major branch', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents\n## BREAKING CHANGES\nSome breaking change',
            title: 'fix(tooltip): Some breaking tooltip fix',
            number: 0,
            headRefName: '',
            baseRefName: 'master',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain(
        'All breaking changes should target the "prerelease/major" branch',
      )
    })

    it('should not fail if a feature is included and base branch is prerelease/minor', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
            title: 'feat(tooltip): Some new Tooltip feature',
            number: 0,
            headRefName: '',
            baseRefName: 'prerelease/minor',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should not fail if a feature is included and base branch is prerelease/major', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
            title: 'feat(tooltip): Some new Tooltip feature',
            number: 0,
            headRefName: '',
            baseRefName: 'prerelease/major',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should not fail if a breaking change is included and prerelease/major', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents\n## BREAKING CHANGES\nSome breaking change',
            title: 'fix(tooltip): Some breaking tooltip fix',
            number: 0,
            headRefName: '',
            baseRefName: 'prerelease/major',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should fail if [skip ci] is detected in the PR title', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents\n## BREAKING CHANGES\nSome breaking change',
            title: 'fix(tooltip): Some breaking tooltip fix [skip ci]',
            number: 0,
            headRefName: '',
            baseRefName: 'prerelease/minor',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toContain('Do not use [skip ci]')
    })

    it('should not fail when all requirements are met', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Some body content\n## Summary\nSome summary\n## Release Category\nComponents',
            title: '',
            number: 0,
            headRefName: '',
            baseRefName: '',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

      expect(verifyPullRequest(input)).toEqual(false)
    })

    it('should not fail on dependabot PRs', () => {
      const input = {
        repository: {
          pullRequest: {
            body: 'Bumps [ajv](https://github.com/ajv-validator/ajv) from 6.12.0 to 6.12.6.\n<details>\n<summary>Release notes</summary>',
            title: 'chore: Bump ajv from 6.12.0 to 6.12.6',
            number: 0,
            headRefName: 'dependabot/npm_and_yarn/ajv-6.12.6',
            baseRefName: '',
            id: '',
            autoMergeRequest: null,
          },
        },
      }

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
