/* eslint-disable */
/* This is an autogenerated file. Do not edit this file directly! */
export type EnablePullRequestAutoMerge = {
    enablePullRequestAutoMerge: ({
        pullRequest: ({
            id: string;
            state: "CLOSED" | "MERGED" | "OPEN";
            autoMergeRequest: ({
                enabledAt: any | null;
                enabledBy: ({
                    login: string;
                }) | null;
            }) | null;
        }) | null;
    }) | null;
};
export type EnablePullRequestAutoMergeVariables = {
    id: string;
    mergeMethod?: ("MERGE" | "REBASE" | "SQUASH") | null;
    commitHeadline?: string | null;
    commitBody?: string | null;
};
