import type { KnipConfig } from 'knip';

const TYPE_TESTS = '**/*.types-test.ts';
const TEST_FILES = 'tests/**/*.test.{ts,tsx}';
const TEST_SOURCES = 'tests/**/*.{ts,tsx}';
const TEST_FIXTURES = 'tests/fixtures/**';
const GENERATORS = 'turbo/generators/**/*.ts';
const SITE_SOURCES = 'src/**/*.{ts,tsx,css,mdx}';
const NEXT_ROUTES = 'src/app/**/{page,layout,route,not-found,sitemap}';
const NEXT_ROUTES_WITH_DEV = `${NEXT_ROUTES}{,.dev}.{ts,tsx}`;
const ESLINT_RUNTIME_DEPS = ['@types/eslint-plugin-security', '@typescript-eslint/parser'];

const typeTestsOnly = { entry: [TYPE_TESTS] };
const typeTestsAndFixtures = { entry: [TYPE_TESTS, 'tests/fixtures/**/*.ts'] };
const eslintPlugin = { ignore: [TEST_FIXTURES], ignoreDependencies: ['discord.js'] };

// unlisted workspaces get knip defaults
export default {
    ignoreDependencies: ['@commitlint/cli', 'ink'],
    ignoreWorkspaces: ['mocks/*'],
    rules: {
        optionalPeerDependencies: 'off'
    },
    tsdown: {
        config: ['vite.config.ts']
    },
    workspaces: {
        '.': {
            entry: [GENERATORS],
            project: [GENERATORS]
        },
        scripts: {
            entry: [
                'src/*.ts',
                'src/docs/{build-docs-artifacts,extract-docs,published-payload,preview-docs,prune-docs-site,purge-cdn-cache,sync-docs-to-artifacts,upload-docs-site}.ts',
                'src/release/{changelog,lint-changesets,release-notes,release-plan,tidy-changelogs}.ts',
                'src/guide/embed-guide-sections.ts',
                'src/release/preview-release.ts',
                'tests/**/*.test.ts'
            ],
            project: ['**/*.ts']
        },
        'apps/docs': {
            entry: [NEXT_ROUTES_WITH_DEV],
            project: ['src/**/*.{ts,tsx,css}'],
            ignoreDependencies: ['wrangler']
        },
        'apps/guide': {
            entry: [NEXT_ROUTES_WITH_DEV, TEST_FILES],
            project: ['worker.ts', SITE_SOURCES, TEST_SOURCES],
            ignoreDependencies: [
                'cloudflare',
                '@seedcord/gateway',
                '@seedcord/http',
                '@discordjs/builders',
                '@seedcord/core',
                '@keyv/sqlite',
                '@seedcord/plugin-i18n',
                '@seedcord/plugin-kysely',
                '@seedcord/plugin-linked-roles',
                '@seedcord/plugin-mongoose',
                '@seedcord/plugin-oauth',
                '@seedcord/plugin-tasks',
                '@types/better-sqlite3',
                '@types/pg',
                'better-sqlite3',
                'db0',
                'discord-api-types',
                'discord.js',
                'envapt',
                'keyv',
                'kysely',
                'mongoose',
                'pg',
                'seedcord',
                'unstorage'
            ]
        },
        'apps/home': {
            entry: [`${NEXT_ROUTES}.{ts,tsx}`, TEST_FILES],
            project: [SITE_SOURCES, TEST_SOURCES]
        },
        'packages/core': { entry: [TYPE_TESTS, 'tests/**/fixtures/**'] },
        'packages/custom-id': typeTestsOnly,
        'packages/errors': typeTestsOnly,
        'packages/event-emitter': typeTestsOnly,
        'packages/gateway': typeTestsOnly,
        'packages/http': {
            entry: [TYPE_TESTS],
            ignore: [
                'tests/node/commands/fixtures/**',
                'tests/node/discovery/fixtures/**',
                'tests/node/discovery/duplicates/**',
                'tests/node/fixtures/**'
            ]
        },
        'packages/logger': { entry: [TYPE_TESTS, 'tests/fixtures/*.ts'] },
        'packages/types': typeTestsOnly,
        'packages/utils': { entry: [TYPE_TESTS], ignore: ['tests/files/fixtures/**'] },
        'plugins/i18n': typeTestsAndFixtures,
        'plugins/kysely': typeTestsOnly,
        'plugins/linked-roles': typeTestsOnly,
        'plugins/mongoose': typeTestsOnly,
        'plugins/oauth': typeTestsOnly,
        'plugins/tasks': typeTestsAndFixtures,
        'cli/seedcord': {
            entry: [TYPE_TESTS, 'playground/**/*.{ts,tsx}', 'tests/fixtures/*/**/*.{ts,tsx,mts,js,jsx,mjs}'],
            ignoreDependencies: ['cloudflare', '@leeoniya/ufuzzy', 'handlebars']
        },
        'cli/create-seedcord': typeTestsOnly,
        'tooling/cli-prompts': { entry: ['playground/preview.ts'] },
        'tooling/plugin-utils': { entry: [TEST_FIXTURES] },
        'tooling/docs-generator': { ignore: ['tests/mock/**', 'tests/mock-base/**'] },
        'tooling/eslint-config': {
            ignoreDependencies: [
                ...ESLINT_RUNTIME_DEPS,
                'eslint-config-prettier',
                'eslint-plugin-security',
                'eslint-plugin-tsdoc',
                'eslint-plugin-unicorn',
                'es-toolkit'
            ]
        },
        'tooling/eslint-config-base': { ignoreDependencies: ESLINT_RUNTIME_DEPS },
        'tooling/eslint-plugin': eslintPlugin,
        'tooling/eslint-plugin-discordjs': eslintPlugin,
        'tooling/prose': { entry: ['src/hook.ts', 'tests/**/*.test.ts'] },
        'tooling/vite-config': { ignore: [TEST_FIXTURES] }
    }
} satisfies KnipConfig;
