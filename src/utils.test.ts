import {
  getChangelogEntry,
  getCommitBody,
  getCommitParts,
  getMergeData,
  getReleaseNotes,
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
  describe('getCommitMessage', () => {
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
            title: 'Merge support/v4.x into master',
            body: '',
            number: 1240,
            id: '',
            autoMergeRequest: null,
          },
        },
      })

      expect(expected).toHaveProperty('commitHeadline', 'Merge support/v4.x into master')
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
  })

  describe('getCommitParts', () => {
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

    it('should fail if a feature is included and base branch is not a prerelease branch', () => {
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

      expect(verifyPullRequest(input)).toContain('All features should target a prerelease branch')
    })

    it('should fail if a feature is included and base branch is not a prerelease branch', () => {
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

    it('should fail if a breaking change is included and base branch is not a prerelease branch', () => {
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
