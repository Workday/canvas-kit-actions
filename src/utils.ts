import {paths} from '@octokit/openapi-types'
import {GetPullRequest} from './__generated__/get-pull-request'

/**
 * Creates a commit message out of Sections. This commit message will be processed later for changelog and release note
 */
export function getCommitBody(sections: Sections) {
  return `${sections.summary || ''}

${sections['release category'] ? `[category:${sections['release category']}]\n\n` : 'Components'}

${sections['release note'] ? `Release Note:\n${sections['release note']}\n\n` : ''}

${sections['breaking changes'] ? `### BREAKING CHANGES\n${sections['breaking changes']}` : ''}
`
    .replace(/\n{2,}/g, '\n\n')
    .trim()
}

/**
 * Determine auto merge data from a PR
 */
export function getMergeData(prData: GetPullRequest) {
  const {title, number, body, headRefName} = prData.repository?.pullRequest || {}
  const sections = getSections(body || '')
  return {
    commitHeadline: headRefName?.startsWith('merge/')
      ? title
      : `${sections['breaking changes'] ? title?.replace(': ', '!: ') : title} (#${number})`,
    commitBody: getCommitBody(sections),
    mergeMethod: headRefName?.startsWith('merge/') ? 'MERGE' : ('SQUASH' as 'MERGE' | 'SQUASH'),
  }
}

export function verifyPullRequest(prData: GetPullRequest): false | string {
  const {title, body, headRefName, baseRefName} = prData.repository?.pullRequest || {}

  if (headRefName?.startsWith('merge/')) {
    return false
  }

  if (!body) {
    return 'verifyPullRequest: No pull request body found'
  }

  const sections = getSections(body)

  if (title?.includes('[skip ci]')) {
    return 'verifyPullRequest: Do not use [skip ci]. Use [skip release] instead to skip automated releases.'
  }
  if (!sections.summary) {
    return 'verifyPullRequest: No Summary section provided. Be sure the pull request description contains a `## Summary` section'
  }
  if (!sections['release category']) {
    return 'verifyPullRequest: No Category section provided. Be sure the pull request description contains a `## Release Category` section or `![category](https://img.shields.io/badge/release_category-Components-blue)` for release notes'
  }

  if (title?.startsWith('feat') && !baseRefName?.startsWith('prerelease')) {
    return `verifyPullRequest: All features should target a prerelease branch. Target branch name: '${baseRefName}'. Please update the base of the pull request to a prerelease branch.`
  }

  if (sections['breaking changes'] && baseRefName !== 'prerelease/major') {
    return 'verifyPullRequest: All breaking changes should target the "prerelease/major" branch. Please update the base of the pull request to "prerelease/major" branch or remove the breaking change.'
  }

  return false
}

type Sections = {
  summary: string
  'release note'?: string
  'release category'?: string
  'breaking changes'?: string
}
function isValidHeading(input: string): input is keyof Sections {
  return ['summary', 'release note', 'release category', 'breaking changes'].includes(input)
}

export function getSections(input: string): Sections {
  let activeSection: keyof Sections | '' = ''

  const sections = input
    .replace(/\r/g, '')
    .split('\n')
    .reduce((result, line) => {
      const headingMatch = line.match(/^#+\s+(.+)/)
      const badgeMatch = line.match(
        /^!\[[a-z]+\]\(https:\/\/img.shields.io\/badge\/([a-z_]+)-([a-z_]+)-[a-z]+\)/i,
      )

      if (headingMatch) {
        const heading = headingMatch[1].trim().toLowerCase()
        if (isValidHeading(heading)) {
          activeSection = heading
          result[activeSection] = ''
        } else {
          // Deactivate active section until a new one is found
          activeSection = ''
        }
      } else if (badgeMatch) {
        const heading = badgeMatch[1].replace(/_/g, ' ').trim()
        const value = badgeMatch[2].replace(/_/g, ' ').trim()
        if (isValidHeading(heading)) {
          result[heading] = value
          // we're done with this heading, deactivate the section
          activeSection = ''
        }
      } else {
        // A horizontal rule will break out of a section
        if (line.trim() === '---') {
          activeSection = ''
        }

        if (activeSection) {
          result[activeSection] += `\n${line}`
        }
      }

      return result
    }, {} as Sections)

  // trim sections and remove comments
  for (const [key, value] of Object.entries(sections)) {
    sections[key as keyof Sections] = value
      .replace(/<!--[\s\S]+?-->/gm, '') // replace comments non-greedily in multiline mode
      .replace(/[\n]{2,}/g, '\n\n') // assume more than 2 newlines in a row are a mistake, perhaps from removing comments
      .trim()
  }

  return sections
}

interface CommitParts {
  title: string
  pull_request: string
  category: string
  'release note': string
  'breaking change': string
}

export function getCommitParts(input: string): CommitParts {
  const lines = input.replace(/\r/g, '').split('\n')
  const firstLine = lines[0].trim()
  const matches = firstLine.match(/(.+?)\s\(#([0-9]+)\)/)

  // capture title and pull request number
  const [_, title, pull_request] = matches || ['', firstLine, '']

  // capture category
  let category = lines.reduce((result, line) => {
    const matches = line.match(/\[category:(.+)]/)
    if (matches) {
      return matches[1]
    }
    return result
  }, '')

  if (!category) {
    // A category is not specified. Try to guess based on the type
    if (title.startsWith('ci:')) {
      category = 'Infrastructure'
    } else if (title.startsWith('docs:')) {
      category = 'Documentation'
    } else {
      // Fall back to 'Components'
      category = 'Components'
    }
  }

  // capture notes and breaking changes
  let activeSection: '' | keyof Pick<CommitParts, 'release note' | 'breaking change'> = ''
  const sections = lines.reduce((result, line) => {
    if (line.startsWith('Release Note:')) {
      activeSection = 'release note'
      result[activeSection] = ''
    } else if (line.startsWith('### BREAKING CHANGE')) {
      activeSection = 'breaking change'
      result[activeSection] = ''
    } else {
      if (activeSection) {
        result[activeSection] += `\n${line}`
      }
    }

    return result
  }, {} as Pick<CommitParts, 'release note' | 'breaking change'>)

  // trim sections and remove comments
  for (const [key, value] of Object.entries(sections)) {
    sections[key as keyof Pick<CommitParts, 'release note' | 'breaking change'>] = value
      .replace(/<!--[\s\S]+?-->/gm, '') // replace comments non-greedily in multiline mode
      .replace(/[\n]{2,}/g, '\n\n') // assume more than 2 newlines in a row are a mistake, perhaps from removing comments
      .trim()
  }

  return {title: title.replace('!: ', ': '), pull_request, category, ...sections}
}

export function getReleaseCommitTitle(
  input: CommitParts,
  owner: string,
  repo: string,
  login: string,
) {
  const baseUrl = 'https://github.com'
  // - fix: Add crossorigin to font preloads [#967](https://github.com/Workday/canvas-kit/pull/967) [@NicholasBoll](https://github.com/NicholasBoll)
  // remove `[skip ci]` and `[skip release]` from commit message in the notes
  return `${input.title.replace(' [skip ci]', '').replace(' [skip release]', '')}${
    input.pull_request ? ` (${getPRLink(owner, repo, input.pull_request)})` : ''
  } ([@${login}](${baseUrl}/${login}))`
}

function getPRLink(owner: string, repo: string, pull_request: string) {
  return `[#${pull_request}](https://github.com/${owner}/${repo}/pull/${pull_request})`
}

export function getDate() {
  return new Date().toISOString().split('T')[0]
}

export function getReleaseTitle(owner: string, repo: string, tagName: string) {
  return `## [${tagName}](https://github.com/${owner}/${repo}/releases/tag/${tagName}) (${getDate()})`
}

type Commits =
  paths['/repos/{owner}/{repo}/compare/{basehead}']['get']['responses']['200']['content']['application/json']['commits']

export function getReleaseNotes(
  owner: string,
  repo: string,
  commits: Commits,
  tagName: string,
): {title: string; body: string; date: string} {
  const notes: string[] = []
  const breaking: string[] = []
  const categories: Record<string, string> = {}

  commits.forEach(commit => {
    const commitParts = getCommitParts(commit.commit.message)

    // don't include dependabot or merge commits
    if (
      commit.author?.login === 'dependabot[bot]' ||
      commit.commit.message.startsWith('Merge') ||
      commit.commit.message.startsWith('chore: Merge') ||
      commit.commit.message.startsWith('chore: Release')
    ) {
      return
    }
    let title = getReleaseCommitTitle(commitParts, owner, repo, commit.author?.login || '')
    if (commitParts['release note']) {
      title += `\n${commitParts['release note']
        .split('\n')
        .map(line => `  ${line}`) // add 2 spaces to extra lines to make them line up with the list item in markdown
        .join('\n')}`
    }
    categories[commitParts.category] = `${categories[commitParts.category] || ''}\n- ${title}`

    if (commitParts['breaking change']) {
      commitParts['breaking change'] //?
      ;`- ${
        commitParts.pull_request ? getPRLink(owner, repo, commitParts.pull_request) + ' ' : ''
      }${commitParts['breaking change']
        .trim()
        .split('\n')
        .map(line => `  ${line}`) // add 2 spaces to extra lines to make them line up with the list item in markdown
        .join('\n')}`
      breaking.push(
        `- ${
          commitParts.pull_request ? getPRLink(owner, repo, commitParts.pull_request) + ' ' : ''
        }${commitParts['breaking change']
          .trim()
          .split('\n')
          .map((line, i) => (i === 0 ? line : `  ${line}`)) // add 2 spaces to extra lines to make them line up with the list item in markdown
          .join('\n')}`,
      )
    }
  })

  let body = ''

  if (breaking.length) {
    body += `### BREAKING CHANGES\n\n${breaking.join('\n')}\n\n`
  }

  body += Object.keys(categories)
    .sort()
    .map(key => {
      return `### ${key}\n\n${categories[key].trim()}`
    })
    .join('\n\n')

  if (notes.length) {
    body += `\n\n### Notes\n\n${notes.join('\n')}`
  }

  return {date: getDate(), title: getReleaseTitle(owner, repo, tagName), body}
}

export function getChangelogEntry(owner: string, repo: string, commits: Commits, tagName: string) {
  const {title, body} = getReleaseNotes(owner, repo, commits, tagName)

  return `${title}\n\n${body}`
}
