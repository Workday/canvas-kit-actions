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
    const { title, number, body, headRefName } = ((_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) || {};
    return {
        commitHeadline: (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('merge/')) ? title : `${title} (#${number})`,
        commitBody: getCommitBody(getSections(body || '')),
        mergeMethod: (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('merge/')) ? 'MERGE' : 'SQUASH',
    };
}
exports.getMergeData = getMergeData;
function verifyPullRequest(prData) {
    var _a;
    const { title, body, headRefName, baseRefName } = ((_a = prData.repository) === null || _a === void 0 ? void 0 : _a.pullRequest) || {};
    if (headRefName === null || headRefName === void 0 ? void 0 : headRefName.startsWith('merge/')) {
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
        return 'verifyPullRequest: No Category section provided. Be sure the pull request description contains a `## Release Category` section or `![category](https://img.shields.io/badge/release_category-Components-blue)` for release notes';
    }
    if ((title === null || title === void 0 ? void 0 : title.startsWith('feat')) && !(baseRefName === null || baseRefName === void 0 ? void 0 : baseRefName.startsWith('prerelease'))) {
        return `verifyPullRequest: All features should target a prerelease branch. Target branch name: '${baseRefName}'. Please update the base of the pull request to a prerelease branch.`;
    }
    if (sections['breaking changes'] && baseRefName !== 'prerelease/major') {
        return 'verifyPullRequest: All breaking changes should target the "prerelease/major" branch. Please update the base of the pull request to "prerelease/major" branch or remove the breaking change.';
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
    return { title, pull_request, category, ...sections };
}
exports.getCommitParts = getCommitParts;
function getReleaseCommitTitle(input, owner, repo, login) {
    const baseUrl = 'https://github.com';
    // - fix: Add crossorigin to font preloads [#967](https://github.com/Workday/canvas-kit/pull/967) [@NicholasBoll](https://github.com/NicholasBoll)
    return `${input.title}${input.pull_request ? ` (${getPRLink(owner, repo, input.pull_request)})` : ''} ([@${login}](${baseUrl}/${login}))`;
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
