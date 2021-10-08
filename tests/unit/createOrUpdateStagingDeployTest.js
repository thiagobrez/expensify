/**
 * @jest-environment node
 */
const core = require('@actions/core');
const moment = require('moment');
const GitUtils = require('../../.github/libs/GitUtils');
const GithubUtils = require('../../.github/libs/GithubUtils');
const run = require('../../.github/actions/createOrUpdateStagingDeploy/createOrUpdateStagingDeploy');

const mockGetInput = jest.fn();
const mockListIssues = jest.fn();
const mockGetPullRequestsMergedBetween = jest.fn();

beforeAll(() => {
    // Mock core module
    core.getInput = mockGetInput;

    // Mock octokit module
    const mocktokit = {
        issues: {
            create: jest.fn().mockImplementation(arg => Promise.resolve({
                data: {
                    ...arg,
                    html_url: 'https://github.com/Expensify/App/issues/29',
                },
            })),
            update: jest.fn().mockImplementation(arg => Promise.resolve({
                data: {
                    ...arg,
                    html_url: `https://github.com/Expensify/App/issues/${arg.issue_number}`,
                },
            })),
            listForRepo: mockListIssues,
        },
        pulls: {
            // Static mock for pulls.list (only used to filter out automated PRs, and that functionality is covered
            // in the test for GithubUtils.generateStagingDeployCashBody
            list: jest.fn().mockResolvedValue([]),
        },
        paginate: jest.fn().mockImplementation(objectMethod => objectMethod().then(({data}) => data)),
    };
    GithubUtils.octokitInternal = mocktokit;

    // Mock GitUtils
    GitUtils.getPullRequestsMergedBetween = mockGetPullRequestsMergedBetween;
});

afterEach(() => {
    mockGetInput.mockClear();
    mockListIssues.mockClear();
    mockGetPullRequestsMergedBetween.mockClear();
});

afterAll(() => {
    jest.clearAllMocks();
});

const LABELS = {
    STAGING_DEPLOY_CASH: {
        id: 2783847782,
        node_id: 'MDU6TGFiZWwyNzgzODQ3Nzgy',
        url: 'https://api.github.com/repos/Expensify/App/labels/StagingDeployCash',
        name: GithubUtils.STAGING_DEPLOY_CASH_LABEL,
        color: '6FC269',
        default: false,
        description: '',
    },
    DEPLOY_BLOCKER_CASH: {
        id: 2810597462,
        node_id: 'MDU6TGFiZWwyODEwNTk3NDYy',
        url: 'https://api.github.com/repos/Expensify/App/labels/DeployBlockerCash',
        name: GithubUtils.DEPLOY_BLOCKER_CASH_LABEL,
        color: '000000',
        default: false,
        description: 'This issue or pull request should block deployment',
    },
};

const basePRList = [
    'https://github.com/Expensify/App/pull/1',
    'https://github.com/Expensify/App/pull/2',
    'https://github.com/Expensify/App/pull/3',
    'https://github.com/Expensify/App/pull/4',
    'https://github.com/Expensify/App/pull/5',
    'https://github.com/Expensify/App/pull/6',
    'https://github.com/Expensify/App/pull/7',
    'https://github.com/Expensify/App/pull/8',
    'https://github.com/Expensify/App/pull/9',
    'https://github.com/Expensify/App/pull/10',
    'https://github.com/Expensify/App/pull/11',
    'https://github.com/Expensify/App/pull/12',
];

const baseIssueList = [
    'https://github.com/Expensify/App/issues/11',
    'https://github.com/Expensify/App/issues/12',
]
// eslint-disable-next-line max-len
const baseExpectedOutput = (tag = '1.0.2-1') => `**Release Version:** \`${tag}\`\r\n**Compare Changes:** https://github.com/Expensify/App/compare/production...staging\r\n\r\n**This release contains changes from the following pull requests:**`;
const openCheckbox = '  - [ ]';
const closedCheckbox = '  - [x]';
const listStart = '- ';
const QA = ' QA';
const accessibility = ' Accessibility';
const ccApplauseLeads = 'cc @Expensify/applauseleads\r\n';
const deployBlockerHeader = '\r\n**Deploy Blockers:**';
const lineBreak = '\r\n';
const lineBreakDouble = '\r\n\r\n';

describe('createOrUpdateStagingDeployCash', () => {
    const closedStagingDeployCash = {
        url: 'https://api.github.com/repos/Expensify/App/issues/28',
        title: 'Test StagingDeployCash',
        number: 28,
        labels: [LABELS.STAGING_DEPLOY_CASH],
        html_url: 'https://github.com/Expensify/App/issues/29',
        // eslint-disable-next-line max-len
        body: `${baseExpectedOutput('1.0.1-0')}`
            + `${lineBreakDouble}${listStart}${basePRList[0]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
            + `${lineBreakDouble}${listStart}${basePRList[1]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
            + `${lineBreakDouble}${listStart}${basePRList[2]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
            + `${lineBreakDouble}${deployBlockerHeader}`
            + `${lineBreakDouble}${listStart}${basePRList[0]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
            + `${lineBreakDouble}${listStart}${basePRList[3]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
            + `${lineBreakDouble}${listStart}${basePRList[4]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
            + `${lineBreakDouble}${ccApplauseLeads}`,
    };

    const baseNewPullRequests = ['6', '7', '8'];

    test('creates new issue when there is none open', () => {
        mockGetInput.mockImplementation((arg) => {
            if (arg === 'GITHUB_TOKEN') {
                return 'fake_token';
            }

            if (arg === 'NPM_VERSION') {
                return '1.0.2-1';
            }
        });

        mockGetPullRequestsMergedBetween.mockImplementation((fromRef, toRef) => {
            if (fromRef === '1.0.1-0' && toRef === '1.0.2-1') {
                return [
                    ...baseNewPullRequests,
                ];
            }
            return [];
        });

        mockListIssues.mockImplementation((args) => {
            if (args.labels === GithubUtils.STAGING_DEPLOY_CASH_LABEL) {
                return {data: [closedStagingDeployCash]};
            }

            return {data: []};
        });

        return run().then((result) => {
            expect(result).toStrictEqual({
                owner: GithubUtils.GITHUB_OWNER,
                repo: GithubUtils.EXPENSIFY_CASH_REPO,
                title: `Deploy Checklist: New Expensify ${moment().format('YYYY-MM-DD')}`,
                labels: [GithubUtils.STAGING_DEPLOY_CASH_LABEL],
                html_url: 'https://github.com/Expensify/App/issues/29',
                assignees: [GithubUtils.APPLAUSE_BOT],
                body: `${baseExpectedOutput()}`
                    + `${lineBreakDouble}${listStart}${basePRList[5]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                    + `${lineBreakDouble}${listStart}${basePRList[6]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                    + `${lineBreakDouble}${listStart}${basePRList[7]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                    + `${lineBreakDouble}${ccApplauseLeads}`,
            });
        });
    });

    describe('updates existing issue when there is one open', () => {
        const openStagingDeployCashBefore = {
            url: 'https://api.github.com/repos/Expensify/App/issues/29',
            title: 'Test StagingDeployCash',
            number: 29,
            labels: [LABELS.STAGING_DEPLOY_CASH],
            // eslint-disable-next-line max-len
            body: `${baseExpectedOutput()}`
                + `${lineBreakDouble}${listStart}${basePRList[5]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                + `${lineBreakDouble}${listStart}${basePRList[6]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                + `${lineBreakDouble}${listStart}${basePRList[7]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                + `${lineBreakDouble}${deployBlockerHeader}`
                + `${lineBreakDouble}${listStart}${basePRList[5]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                + `${lineBreakDouble}${listStart}${basePRList[8]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                + `${lineBreakDouble}${listStart}${basePRList[9]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                + `${lineBreakDouble}${ccApplauseLeads}`,
            state: 'open',
        };

        const currentOpenDeployBlockers = [
            {
                html_url: 'https://github.com/Expensify/App/pull/6',
                number: 6,
                state: 'open',
                labels: [LABELS.DEPLOY_BLOCKER_CASH],
            },
            {
                html_url: 'https://github.com/Expensify/App/pull/9',
                number: 9,
                state: 'open',
                labels: [LABELS.DEPLOY_BLOCKER_CASH],
            },
            {
                html_url: 'https://github.com/Expensify/App/pull/10',
                number: 10,
                state: 'open',
                labels: [LABELS.DEPLOY_BLOCKER_CASH],
            },
        ];

        test('with NPM_VERSION input, pull requests, and deploy blockers', () => {
            mockGetInput.mockImplementation((arg) => {
                if (arg === 'GITHUB_TOKEN') {
                    return 'fake_token';
                }

                if (arg === 'NPM_VERSION') {
                    return '1.0.2-2';
                }
            });

            // New pull requests to add to open StagingDeployCash
            const newPullRequests = ['9', '10'];
            mockGetPullRequestsMergedBetween.mockImplementation((fromRef, toRef) => {
                if (fromRef === '1.0.1-0' && toRef === '1.0.2-2') {
                    return [
                        ...baseNewPullRequests,
                        ...newPullRequests,
                    ];
                }
                return [];
            });

            mockListIssues.mockImplementation((args) => {
                if (args.labels === GithubUtils.STAGING_DEPLOY_CASH_LABEL) {
                    return {data: [openStagingDeployCashBefore, closedStagingDeployCash]};
                }

                if (args.labels === GithubUtils.DEPLOY_BLOCKER_CASH_LABEL) {
                    return {
                        data: [
                            ...currentOpenDeployBlockers,
                            {
                                html_url: 'https://github.com/Expensify/App/pull/11', // New
                                number: 11,
                                state: 'open',
                                labels: [LABELS.DEPLOY_BLOCKER_CASH],
                            },
                            {
                                html_url: 'https://github.com/Expensify/App/pull/12', // New
                                number: 12,
                                state: 'open',
                                labels: [LABELS.DEPLOY_BLOCKER_CASH],
                            },
                        ],
                    };
                }

                return {data: []};
            });

            return run().then((result) => {
                expect(result).toStrictEqual({
                    owner: GithubUtils.GITHUB_OWNER,
                    repo: GithubUtils.EXPENSIFY_CASH_REPO,
                    issue_number: openStagingDeployCashBefore.number,
                    // eslint-disable-next-line max-len
                    html_url: `https://github.com/Expensify/App/issues/${openStagingDeployCashBefore.number}`,
                    // eslint-disable-next-line max-len
                    body: `${baseExpectedOutput('1.0.2-2')}`
                        + `${lineBreakDouble}${listStart}${basePRList[5]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[6]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[7]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[8]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[9]}${lineBreak}${closedCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${deployBlockerHeader}`
                        + `${lineBreakDouble}${listStart}${basePRList[5]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[8]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[9]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[10]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${listStart}${basePRList[11]}${lineBreak}${openCheckbox}${QA}${lineBreak}${openCheckbox}${accessibility}`
                        + `${lineBreakDouble}${ccApplauseLeads}`,
                });
            });
        });

        test('without NPM_VERSION input, just a new deploy blocker', () => {
            mockGetPullRequestsMergedBetween.mockImplementation((fromRef, toRef) => {
                if (fromRef === '1.0.1-0' && toRef === '1.0.2-2') {
                    return [
                        ...baseNewPullRequests,
                    ];
                }
                return [];
            });
            mockListIssues.mockImplementation((args) => {
                if (args.labels === GithubUtils.STAGING_DEPLOY_CASH_LABEL) {
                    return {data: [openStagingDeployCashBefore, closedStagingDeployCash]};
                }

                if (args.labels === GithubUtils.DEPLOY_BLOCKER_CASH_LABEL) {
                    return {
                        data: [
                            ...currentOpenDeployBlockers,
                            {
                                html_url: 'https://github.com/Expensify/App/issues/11', // New
                                number: 11,
                                state: 'open',
                                labels: [LABELS.DEPLOY_BLOCKER_CASH],
                            },
                            {
                                html_url: 'https://github.com/Expensify/App/issues/12', // New
                                number: 12,
                                state: 'open',
                                labels: [LABELS.DEPLOY_BLOCKER_CASH],
                            },
                        ],
                    };
                }

                return {data: []};
            });

            return run().then((result) => {
                expect(result).toStrictEqual({
                    owner: GithubUtils.GITHUB_OWNER,
                    repo: GithubUtils.EXPENSIFY_CASH_REPO,
                    issue_number: openStagingDeployCashBefore.number,
                    // eslint-disable-next-line max-len
                    html_url: `https://github.com/Expensify/App/issues/${openStagingDeployCashBefore.number}`,
                    // eslint-disable-next-line max-len
                    body: '**Release Version:** `1.0.2-2`\r\n**Compare Changes:** https://github.com/Expensify/App/compare/production...staging\r\n\r\n**This release contains changes from the following pull requests:**\r\n- [ ] https://github.com/Expensify/App/pull/6\r\n- [x] https://github.com/Expensify/App/pull/7\r\n- [ ] https://github.com/Expensify/App/pull/8\r\n\r\n**Deploy Blockers:**\r\n- [ ] https://github.com/Expensify/App/pull/6\r\n- [ ] https://github.com/Expensify/App/issues/9\r\n- [x] https://github.com/Expensify/App/issues/10\r\n- [ ] https://github.com/Expensify/App/issues/11\r\n- [ ] https://github.com/Expensify/App/issues/12\r\n\r\ncc @Expensify/applauseleads\r\n',
                });
            });
        });
    });
});
