export interface MockSearchResult {
    id: string;
    title: string;
    tab: string;
    excerpt: string;
}

export const MOCK_SEARCH_RESULTS: readonly MockSearchResult[] = [
    {
        id: 'options',
        title: 'Options that type themselves',
        tab: 'Commands',
        excerpt: 'Codegen reads your declaration and types this.options, so a required option comes back non-null.'
    },
    {
        id: 'catalog',
        title: 'The gates that ship',
        tab: 'Gates and errors',
        excerpt: 'A gate runs before your handler body and can stop it. seedcord ships a catalog of common checks.'
    },
    {
        id: 'paging',
        title: 'Paging a list',
        tab: 'Components',
        excerpt: 'A paginator owns its buttons, its customIds, and the page swap. You give it a source and a renderer.'
    },
    {
        id: 'logging',
        title: 'Logging from a handler',
        tab: 'Tooling',
        excerpt: 'Every handler, middleware, and plugin already carries a logger, so normal code constructs none.'
    },
    {
        id: 'levels',
        title: 'Levels',
        tab: 'Tooling',
        excerpt: 'Five levels, with debug and trace off in production.'
    },
    {
        id: 'declaring',
        title: 'Declaring a command',
        tab: 'Commands',
        excerpt: 'One class, one decorator, and a builder that types its own options.'
    },
    {
        id: 'autocomplete',
        title: 'Autocomplete',
        tab: 'Commands',
        excerpt: 'Answer as the user types, with the same typed option registry.'
    },
    {
        id: 'modals',
        title: 'Modals',
        tab: 'Components',
        excerpt: 'Open a form from a command or a button, and read what came back.'
    },
    {
        id: 'customid',
        title: 'Declaring a customId',
        tab: 'Components',
        excerpt: 'Pack typed fields into the 100 characters Discord gives you.'
    },
    {
        id: 'cooldown',
        title: 'Cooldown a command',
        tab: 'Gates and errors',
        excerpt: 'A sliding window keyed by route, with the refusal a user reads.'
    },
    {
        id: 'refusals',
        title: 'Wording a refusal',
        tab: 'Gates and errors',
        excerpt: 'What a gate says when it stops a handler, and who sees it.'
    },
    {
        id: 'hot-reload',
        title: 'Hot reload',
        tab: 'Tooling',
        excerpt: 'The dev server swaps a handler without dropping the gateway session.'
    }
];
