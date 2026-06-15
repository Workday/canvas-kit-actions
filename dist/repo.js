"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepo = getRepo;
const lib_1 = require("./lib");
const gql = (strings) => strings.raw[0];
function getRepo({ token, owner, repo }) {
    const octokit = lib_1.actionsGithub.getOctokit(token, { previews: ['merge-info-preview'] });
    const repository = {
        async getCommits({ base, head }) {
            return octokit.rest.repos
                .compareCommitsWithBasehead({
                owner,
                repo,
                basehead: `${base}...${head}`,
                per_page: 100,
            })
                .then(r => r.data.commits)
                .catch(e => {
                throw new Error(`Could not find either "${head}" or "${base}" refs in git. Check that these refs exist and try again.`);
            });
            // return octokit.rest.git.getRef({repo, owner, ref: `heads/master`})
        },
        /** Gets the related issues from a pull request */
        async getRelatedIssues(number) {
            return octokit.graphql(gql `
          query GetRelatedIssues($owner: String!, $repo: String!, $number: Int!) {
            repository(name: $repo, owner: $owner) {
              pullRequest(number: $number) {
                closingIssuesReferences(first: 5) {
                  nodes {
                    id
                    title
                    number
                  }
                }
              }
            }
          }
        `, { owner, repo, number });
        },
        async getPullRequest(number) {
            return octokit.graphql(gql `
          query GetPullRequest($owner: String!, $repo: String!, $number: Int!) {
            repository(owner: $owner, name: $repo) {
              pullRequest(number: $number) {
                body
                title
                number
                headRefName
                baseRefName
                id
                mergeable
                mergeStateStatus
                author {
                  login
                }
                # Touch-ups tend to be at the end, so use 'last' to avoid paging
                commits(last: 100) {
                  totalCount
                  nodes {
                    commit {
                      # additions and deletions to figure out contribution amount
                      additions
                      deletions
                      message
                      authoredByCommitter
                      authors(first: 5) {
                        nodes {
                          name
                          email
                          user {
                            login
                          }
                        }
                      }
                    }
                  }
                }
                autoMergeRequest {
                  commitBody
                  commitHeadline
                  enabledAt
                }
              }
            }
          }
        `, { owner, repo, number });
            // return Promise.resolve<GetPullRequest>({
            //   repository: {
            //     pullRequest: {
            //       body: '## Summary\r\n\r\nUpdate the pull request template to include sections that are important to release automation.\r\n\r\n<!-- This is the category in the release notes. Common categories are Components, Infrastructure, and Documentation -->\r\n### Category\r\nInfrastructure\r\n\r\n---',
            //       title: 'chore: Update pull request template',
            //       number: 1268,
            //       headRefName: 'chore/update-pull-request-template',
            //     },
            //   },
            // })
        },
        async closeIssue(id) {
            return octokit.graphql(gql `
          mutation UpdateIssueInput($id: ID!, $state: IssueState!) {
            updateIssue(input: {id: $id, state: $state}) {
              issue {
                id
                closedAt
                state
              }
            }
          }
        `, { id, state: 'CLOSED' });
        },
        async enableAutoMerge(input) {
            return octokit.graphql(gql `
          mutation EnablePullRequestAutoMerge(
            $id: ID!
            $mergeMethod: PullRequestMergeMethod
            $commitHeadline: String
            $commitBody: String
          ) {
            enablePullRequestAutoMerge(
              input: {
                pullRequestId: $id
                mergeMethod: $mergeMethod
                commitHeadline: $commitHeadline
                commitBody: $commitBody
              }
            ) {
              pullRequest {
                id
                state
                autoMergeRequest {
                  enabledAt
                  enabledBy {
                    login
                  }
                }
              }
            }
          }
        `, input);
        },
        async merge(input) {
            return octokit.graphql(gql `
          mutation MergePullRequest($input: MergePullRequestInput!) {
            mergePullRequest(input: $input) {
              pullRequest {
                merged
                mergedAt
                state
                url
              }
            }
          }
        `, { input });
        },
        async disableAutoMerge(input) {
            return octokit.graphql(gql `
          mutation DisablePullRequestAutoMerge($id: ID!) {
            disablePullRequestAutoMerge(input: {pullRequestId: $id}) {
              pullRequest {
                id
              }
            }
          }
        `, input);
        },
    };
    return repository;
}
