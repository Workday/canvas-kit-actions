"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChangelogEntry = exports.getReleaseNotes = exports.getReleaseTitle = exports.getDate = exports.getReleaseCommitTitle = exports.getCommitParts = exports.getSections = exports.verifyPullRequest = exports.getMergeData = exports.getCommitBody = void 0;
/**
 * Creates a commit message out of Sections. This commit message will be processed later for changelog and release note
 */
function getCommitBody(sections) {
    return `${sections.summary || ''}

${sections['release category'] ? `[category:${sections['release category']}]\n\n` : 'Components'}

${sections['release note'] ? `Release Note:\n${sections['release note']}\n\n` : ''}

${sections['breaking changes'] ? `### BREAKING CHANGES\n${sections['breaking changes']}` : ''}
`
        .replace(/\n{2,}/g, '\n\n')
        .trim();
}
exports.getCommitBody = getCommitBody;
/**
 * Determine auto merge data from a PR
 */
function getMergeData(prData) {
    var _a;
    const { title, number, body, headRefName, baseRefName } = ((_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) || {};
    const sections = getSections(body || '');
    let commitBody = '';
    if (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('merge/')) {
        commitBody = '';
    }
    else if (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('dependabot/')) {
        commitBody = getCommitBody({
            summary: (body === null || body === void 0 ? void 0 : body.split('\n')[0]) || '',
            'release category': 'Dependencies',
        });
    }
    else {
        commitBody = getCommitBody(sections);
    }
    return {
        commitHeadline: `${sections['breaking changes'] ? title === null || title === void 0 ? void 0 : title.replace(': ', '!: ') : title} (#${number})`,
        commitBody,
        mergeMethod: (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('merge/')) ? 'MERGE' : 'SQUASH',
    };
}
exports.getMergeData = getMergeData;
function verifyPullRequest(prData) {
    var _a;
    const { title, body, headRefName, baseRefName } = ((_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) || {};
    // Merge pull requests
    if (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('merge/')) {
        return false;
    }
    // Dependabot pull requests
    if (headRefName === null || headRefName === void 0 ? void 0 : headRefName.includes('dependabot/')) {
        return false;
    }
    if (!body) {
        return 'verifyPullRequest: No pull request body found';
    }
    const sections = getSections(body);
    if (title === null || title === void 0 ? void 0 : title.includes('[skip ci]')) {
        return 'verifyPullRequest: Do not use [skip ci]. Use [skip release] instead to skip automated releases.';
    }
    if (!sections.summary) {
        return 'verifyPullRequest: No Summary section provided. Be sure the pull request description contains a `## Summary` section';
    }
    if (!sections['release category']) {
        return 'verifyPullRequest: No Category section provided. Be sure the pull request description contains a `## Release Category` section or `![category](https://img.shields.io/badge/release_category-Components-blue)` for changelog and release notes';
    }
    if ((title === null || title === void 0 ? void 0 : title.startsWith('feat')) && baseRefName === 'support') {
        return `verifyPullRequest: The support branch should only contain fixes. Please change the type of the pull request title to include "fix" instead of "feat".`;
    }
    if ((title === null || title === void 0 ? void 0 : title.startsWith('feat')) && baseRefName === 'master') {
        return `verifyPullRequest: The master branch should only contain fixes. The "prerelease/minor" branch can contain new features which are released on a 3 week cadence.\n\nPlease update the base of the pull request to target the "prerelease/minor" branch. You can do so by clicking the "Edit" button at the top of the pull request and change the base to "prerelease/minor".\n\nIf you see extra commits after updating the base branch, it means we have not properly forward merged "master" into "prerelease/minor". These additional commits are our fault, not yours. You can safely ignore them. Once we finish updating branches, the commits will disappear.`;
    }
    if (sections['breaking changes'] && baseRefName !== 'prerelease/major') {
        return 'verifyPullRequest: All breaking changes should target the "prerelease/major" branch. Please update the base of the pull request to "prerelease/major" branch or remove the breaking change. \n\nIf you see extra commits after updating the base branch, it means we have not properly forward merged "master" into "prerelease/minor". These additional commits are our fault, not yours. You can safely ignore them. Once we finish updating branches, the commits will disappear.';
    }
    return false;
}
exports.verifyPullRequest = verifyPullRequest;
function isValidHeading(input) {
    return ['summary', 'release note', 'release category', 'breaking changes'].includes(input);
}
function getSections(input) {
    let activeSection = '';
    const sections = input
        .replace(/\r/g, '')
        .split('\n')
        .reduce((result, line) => {
        const headingMatch = line.match(/^#+\s+(.+)/);
        const badgeMatch = line.match(/^!\[[a-z]+\]\(https:\/\/img.shields.io\/badge\/([a-z_]+)-([a-z_]+)-[a-z]+\)/i);
        if (headingMatch) {
            const heading = headingMatch[1].trim().toLowerCase();
            if (isValidHeading(heading)) {
                activeSection = heading;
                result[activeSection] = '';
            }
            else {
                // Deactivate active section until a new one is found
                activeSection = '';
            }
        }
        else if (badgeMatch) {
            const heading = badgeMatch[1].replace(/_/g, ' ').trim();
            const value = badgeMatch[2].replace(/_/g, ' ').trim();
            if (isValidHeading(heading)) {
                result[heading] = value;
                // we're done with this heading, deactivate the section
                activeSection = '';
            }
        }
        else {
            // A horizontal rule will break out of a section
            if (line.trim() === '---') {
                activeSection = '';
            }
            if (activeSection) {
                result[activeSection] += `\n${line}`;
            }
        }
        return result;
    }, {});
    // trim sections and remove comments
    for (const [key, value] of Object.entries(sections)) {
        sections[key] = value
            .replace(/<!--[\s\S]+?-->/gm, '') // replace comments non-greedily in multiline mode
            .replace(/[\n]{2,}/g, '\n\n') // assume more than 2 newlines in a row are a mistake, perhaps from removing comments
            .trim();
    }
    // Catch dependabot PRs and set the correct section
    if (!sections.summary) {
        const matches = input.match(/(Bumps.+from.+to.+)/);
        if (matches) {
            sections.summary = matches[0];
            sections['release category'] = 'Dependencies';
        }
    }
    return sections;
}
exports.getSections = getSections;
function getCommitParts(input) {
    const lines = input.replace(/\r/g, '').split('\n');
    const firstLine = lines[0].trim();
    const matches = firstLine.match(/(.+?)\s\(#([0-9]+)\)/);
    // capture title and pull request number
    const [_, title, pull_request] = matches || ['', firstLine, ''];
    // capture category
    let category = lines.reduce((result, line) => {
        const matches = line.match(/\[category:(.+)]/);
        if (matches) {
            return matches[1];
        }
        return result;
    }, '');
    if (!category) {
        // A category is not specified. Try to guess based on the type
        if (title.startsWith('ci:')) {
            category = 'Infrastructure';
        }
        else if (title.startsWith('docs:')) {
            category = 'Documentation';
        }
        else {
            // Fall back to 'Components'
            category = 'Components';
        }
    }
    // capture notes and breaking changes
    let activeSection = '';
    const sections = lines.reduce((result, line) => {
        if (line.startsWith('Release Note:')) {
            activeSection = 'release note';
            result[activeSection] = '';
        }
        else if (line.startsWith('### BREAKING CHANGE')) {
            activeSection = 'breaking change';
            result[activeSection] = '';
        }
        else {
            if (activeSection) {
                result[activeSection] += `\n${line}`;
            }
        }
        return result;
    }, {});
    // trim sections and remove comments
    for (const [key, value] of Object.entries(sections)) {
        sections[key] = value
            .replace(/<!--[\s\S]+?-->/gm, '') // replace comments non-greedily in multiline mode
            .replace(/[\n]{2,}/g, '\n\n') // assume more than 2 newlines in a row are a mistake, perhaps from removing comments
            .trim();
    }
    return { title: title.replace('!: ', ': '), pull_request, category, ...sections };
}
exports.getCommitParts = getCommitParts;
function getReleaseCommitTitle(input, owner, repo, login) {
    const baseUrl = 'https://github.com';
    // - fix: Add crossorigin to font preloads [#967](https://github.com/Workday/canvas-kit/pull/967) [@NicholasBoll](https://github.com/NicholasBoll)
    // remove `[skip ci]` and `[skip release]` from commit message in the notes
    return `${input.title.replace(' [skip ci]', '').replace(' [skip release]', '')}${input.pull_request ? ` (${getPRLink(owner, repo, input.pull_request)})` : ''} ([@${login}](${baseUrl}/${login}))`;
}
exports.getReleaseCommitTitle = getReleaseCommitTitle;
function getPRLink(owner, repo, pull_request) {
    return `[#${pull_request}](https://github.com/${owner}/${repo}/pull/${pull_request})`;
}
function getDate() {
    return new Date().toISOString().split('T')[0];
}
exports.getDate = getDate;
function getReleaseTitle(owner, repo, tagName) {
    return `## [${tagName}](https://github.com/${owner}/${repo}/releases/tag/${tagName}) (${getDate()})`;
}
exports.getReleaseTitle = getReleaseTitle;
function getReleaseNotes(owner, repo, commits, tagName) {
    const notes = [];
    const breaking = [];
    const categories = {};
    commits.forEach(commit => {
        var _a, _b;
        const commitParts = getCommitParts(commit.commit.message);
        // don't include dependabot or merge commits
        if (((_a = commit.author) === null || _a === void 0 ? void 0 : _a.login) === 'dependabot[bot]' ||
            commit.commit.message.startsWith('Merge') ||
            commit.commit.message.startsWith('chore: Merge') ||
            commit.commit.message.startsWith('chore: Release')) {
            return;
        }
        let title = getReleaseCommitTitle(commitParts, owner, repo, ((_b = commit.author) === null || _b === void 0 ? void 0 : _b.login) || '');
        if (commitParts['release note']) {
            title += `\n${commitParts['release note']
                .split('\n')
                .map(line => `  ${line}`) // add 2 spaces to extra lines to make them line up with the list item in markdown
                .join('\n')}`;
        }
        categories[commitParts.category] = `${categories[commitParts.category] || ''}\n- ${title}`;
        if (commitParts['breaking change']) {
            commitParts['breaking change'] //?
            ;
            `- ${commitParts.pull_request ? getPRLink(owner, repo, commitParts.pull_request) + ' ' : ''}${commitParts['breaking change']
                .trim()
                .split('\n')
                .map(line => `  ${line}`) // add 2 spaces to extra lines to make them line up with the list item in markdown
                .join('\n')}`;
            breaking.push(`- ${commitParts.pull_request ? getPRLink(owner, repo, commitParts.pull_request) + ' ' : ''}${commitParts['breaking change']
                .trim()
                .split('\n')
                .map((line, i) => (i === 0 ? line : `  ${line}`)) // add 2 spaces to extra lines to make them line up with the list item in markdown
                .join('\n')}`);
        }
    });
    let body = '';
    if (breaking.length) {
        body += `### BREAKING CHANGES\n\n${breaking.join('\n')}\n\n`;
    }
    body += Object.keys(categories)
        .sort()
        .map(key => {
        return `### ${key}\n\n${categories[key].trim()}`;
    })
        .join('\n\n');
    if (notes.length) {
        body += `\n\n### Notes\n\n${notes.join('\n')}`;
    }
    return { date: getDate(), title: getReleaseTitle(owner, repo, tagName), body };
}
exports.getReleaseNotes = getReleaseNotes;
function getChangelogEntry(owner, repo, commits, tagName) {
    const { title, body } = getReleaseNotes(owner, repo, commits, tagName);
    return `${title}\n\n${body}`;
}
exports.getChangelogEntry = getChangelogEntry;
