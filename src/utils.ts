import {paths} from '@octokit/openapi-types'
import {GetPullRequest} from './__generated__/get-pull-request'

/**
 * Creates a commit message out of Sections. This commit message will be processed later for
 * changelog and release note.
 *
 * For example:
 * Input:
 * ```ts
 * {
 *   summary: 'My summary',
 *   'release category': 'Components',
 *   'release note': 'My release notes',
 *   'breaking changes': 'Some breaking changes'
 * }
 * ```
 *
 * Output:
 * ```ts
 * `
 * My summary
 *
 * [category:Components]
 *
 * Release Note:
 * My release notes
 *
 * ### BREAKING CHANGES
 * Some breaking changes
 * `
 * ```
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

type Author = {name: string; login: string | null; email: string}

/**
 * Merges a list of authors together, prioritizing login. Sometimes people commit without an
 * associated login. For example, if someone commits with an email that isn't associated with a
 * GitHub account, and another commit will be. The merging algorithm uses a name as a unique key.
 * This has the unfortunate issue where 2 contributors with the same name will be treated as single
 * contributor. This case is less likely than the case where the same person has multiple commits
 * with different emails or login. Treating a name as unique prevents a person from being listed
 * twice in these cases. See `fixtures/getPullRequestMultipleAuthors.json` for a real example.
 *
 * Input: [
 *   {name: 'John Doe', email: 'john.doe@some-email.com', login: null},
 *   {name: 'John Doe', email: 'john.doe@example.com', login: 'JohnDoe'}
 * ]
 *
 * Output: [
 *   {name: 'John Doe', email: 'john.doe@example.com', login: 'JohnDoe'}
 * ]
 */
export function mergeAuthors(authors: Author[]): Author[] {
  return authors.reduce((result, author) => {
    const existingAuthor = result.find(a => a.name === author.name)
    if (existingAuthor) {
      // prefer defined logins. This can happen if someone has a Github login, but didn't associate the email in the commit with their login
      if (!existingAuthor.login && author.login) {
        existingAuthor.login = author.login
        existingAuthor.email = author.email
      }
    } else {
      result.push(author)
    }
    return result
  }, [] as Author[])
}

/**
 * Determine auto merge data from a PR. This will choose the merge method, commit headline,  and
 * commit body. The commit body will encode PR sections like Summary, Release Notes, Breaking
 * Changes, and co-authors.
 *
 * @param prData data from GraphQL API call. Contains PR number, commits, etc
 */
export function getMergeData(prData: GetPullRequest) {
  const {title, number, body, headRefName, baseRefName, author} =
    prData.repository?.pullRequest || {}
  const sections = getSections(body || '')
  let commitBody = ''

  // Create an array of all authors listed in commits. It will look like:
  // [ {login: null, name: "John Doe", email: "john.doe@example.com"} ]
  const additionalAuthors = (prData.repository?.pullRequest?.commits.nodes || [])
    .filter(n => !n?.commit.message.startsWith('Merge branch')) // filter out merge commits
    .flatMap(
      node =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        node?.commit.authors.nodes?.map(n => ({
          name: n?.name || '',
          email: n?.email || '',
          login: n?.user?.login || null,
        }))!,
    )
    .filter(v => !!v) // filter out empty results

  // Collect authors into an object keyed by name, merging them and using a `login` if it exists per name
  // While it is possible for 2 people to have the same
  const authors = mergeAuthors(additionalAuthors).filter(a => a.login !== author?.login)

  if (headRefName?.startsWith('merge/')) {
    commitBody = ''
  } else if (headRefName?.startsWith('dependabot/')) {
    commitBody = getCommitBody({
      summary: body?.split('\n')[0] || '',
      'release category': 'Dependencies',
    })
  } else {
    commitBody = getCommitBody(sections)
  }

  if (authors.length) {
    commitBody += `\n\n${authors
      .map(a => (a ? `Co-authored-by: ${a.login ? `@${a.login}` : a.name} <${a.email}>` : ''))
      .join('\n')}`
  }

  return {
    commitHeadline: `${
      sections['breaking changes'] ? title?.replace(': ', '!: ') : title
    } (#${number})`,
    commitBody,
    mergeMethod: headRefName?.startsWith('merge/') ? 'MERGE' : ('SQUASH' as 'MERGE' | 'SQUASH'),
  }
}

/**
 * Verify a pull request has all the valid info. The validation ensures commit messages are correct
 * for automated release note generation.
 */
export function verifyPullRequest(prData: GetPullRequest): false | string {
  const {title, body, headRefName, baseRefName} = prData.repository?.pullRequest || {}

  // Merge pull requests
  if (headRefName?.startsWith('merge/')) {
    return false
  }

  // Dependabot pull requests
  if (headRefName?.includes('dependabot/')) {
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
    return 'verifyPullRequest: No Category section provided. Be sure the pull request description contains a `## Release Category` section or `![category](https://img.shields.io/badge/release_category-Components-blue)` for changelog and release notes'
  }

  if (title?.startsWith('feat') && baseRefName === 'support') {
    return `verifyPullRequest: The support branch should only contain fixes. Please change the type of the pull request title to include "fix" instead of "feat".`
  }

  if (title?.startsWith('feat') && baseRefName === 'master') {
    return `verifyPullRequest: The master branch should only contain fixes. The "prerelease/minor" branch can contain new features which are released on a 3 week cadence.\n\nPlease update the base of the pull request to target the "prerelease/minor" branch. You can do so by clicking the "Edit" button at the top of the pull request and change the base to "prerelease/minor".\n\nIf you see extra commits after updating the base branch, it means we have not properly forward merged "master" into "prerelease/minor". These additional commits are our fault, not yours. You can safely ignore them. Once we finish updating branches, the commits will disappear.`
  }

  if (sections['breaking changes'] && baseRefName !== 'prerelease/major') {
    return 'verifyPullRequest: All breaking changes should target the "prerelease/major" branch. Please update the base of the pull request to "prerelease/major" branch or remove the breaking change. \n\nIf you see extra commits after updating the base branch, it means we have not properly forward merged "master" into "prerelease/minor". These additional commits are our fault, not yours. You can safely ignore them. Once we finish updating branches, the commits will disappear.'
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

/**
 * Parse a PR body and return all the related sections. Used for verification and commit message
 * encoding.
 */
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

  // Catch dependabot PRs and set the correct section
  if (!sections.summary) {
    const matches = input.match(/(Bumps.+from.+to.+)/)
    if (matches) {
      sections.summary = matches[0]
      sections['release category'] = 'Dependencies'
    }
  }

  return sections
}

interface CommitParts {
  title: string
  pull_request: string
  category: string
  'release note': string
  'breaking change': string
  additionalAuthors?: string[]
}

/**
 * Parse a commit message and extract important information. Used for release note generation.
 */
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

  const additionalAuthors = [] as string[]

  // capture notes and breaking changes
  let activeSection: '' | keyof Pick<CommitParts, 'release note' | 'breaking change'> = ''
  const sections = lines.reduce((result, line) => {
    if (line.startsWith('Release Note:')) {
      activeSection = 'release note'
      result[activeSection] = ''
    } else if (line.startsWith('### BREAKING CHANGE')) {
      activeSection = 'breaking change'
      result[activeSection] = ''
    } else if (line.startsWith('Co-authored-by')) {
      const matches = /Co-authored-by:\s(.+)\s<.+>/.exec(line)
      if (matches) {
        additionalAuthors.push(matches[1])
      }
    } else {
      if (activeSection) {
        result[activeSection] += `\n${line}`
      }
    }

    return result
  }, {} as Pick<CommitParts, 'release note' | 'breaking change' | 'additionalAuthors'>)

  type myKeys = keyof CommitParts
  // trim sections and remove comments
  for (const [key, value] of Object.entries(sections)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sections as any)[key] =
      typeof value === 'string'
        ? value
            .replace(/<!--[\s\S]+?-->/gm, '') // replace comments non-greedily in multiline mode
            .replace(/[\n]{2,}/g, '\n\n') // assume more than 2 newlines in a row are a mistake, perhaps from removing comments
            .trim()
        : value
  }

  if (additionalAuthors.length) {
    sections['additionalAuthors'] = additionalAuthors
  }

  return {title: title.replace('!: ', ': '), pull_request, category, ...sections}
}

function getLoginLink(login: string, baseUrl: string) {
  return `[@${login}](${baseUrl}/${login})`
}

export function getReleaseCommitTitle(
  input: CommitParts,
  owner: string,
  repo: string,
  login: string,
  additionalAuthors?: string[],
) {
  const baseUrl = 'https://github.com'
  const authors = [getLoginLink(login, baseUrl)]
  if (additionalAuthors) {
    authors.push(
      ...additionalAuthors.map(a =>
        a.startsWith('@') ? getLoginLink(a.replace('@', ''), baseUrl) : a,
      ),
    )
  }
  // - fix: Add cross-origin to font preloads [#967](https://github.com/Workday/canvas-kit/pull/967) [@NicholasBoll](https://github.com/NicholasBoll)
  // remove `[skip ci]` and `[skip release]` from commit message in the notes
  return `${input.title.replace(' [skip ci]', '').replace(' [skip release]', '')}${
    input.pull_request ? ` (${getPRLink(owner, repo, input.pull_request)})` : ''
  } (${authors.join(', ')})`
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

/**
 * Get release notes from a series of commit objects that come from the Github API. It will parse
 * each commit message, extracting useful info like breaking changes, co-authors, and additional
 * release notes.
 */
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
    let title = getReleaseCommitTitle(
      commitParts,
      owner,
      repo,
      commit.author?.login || '',
      // filter additional authors that include the PR's author login For example, if a commit has a
      // `Co-authored-by` that contains the original PR's author, we filter it out. Without this,
      // you'll get contributions that look like `(@alanbsmith, @alanbsmith)`
      commitParts['additionalAuthors']?.filter(
        a => a.replace('@', '') !== commit.author?.login || '',
      ),
    )
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

export function getNextBranch(branch: string = '', mainBranch: string) {
  switch (branch) {
    case 'support':
      return mainBranch
    case mainBranch:
      return 'prerelease/minor'
    case 'prerelease/minor':
      return 'prerelease/major'
    default:
      throw Error(
        `Could not determine a forward merge branch for "${branch}". Supported branch inputs are support, master, and prerelease/minor`,
      )
  }
}
