import { defineConfig } from 'react-doctor/api';

export default defineConfig({
    ignore: {
        files: ['**/app/dev/**', '**/tests/**'],

        overrides: [
            {
                files: ['**/ui/DevApp.tsx'],
                rules: [
                    'react-doctor/no-adjust-state-on-prop-change',
                    'react-doctor/no-chain-state-updates',
                    'react-doctor/prefer-useReducer'
                ]
            },
            {
                // trusted build-time HTML (shiki highlight + rendered TSDoc), never user input
                files: [
                    '**/CodeBlock.tsx',
                    '**/CodePanel.tsx',
                    '**/components/code/CodeCard.tsx',
                    '**/components/docs/ReadmeBlock.tsx',
                    '**/components/docs/entity/comments/CommentParagraphs.tsx',
                    '**/components/docs/entity/enums/EnumMemberCard.tsx',
                    '**/components/docs/entity/member/MemberRowBody.tsx',
                    '**/components/docs/entity/utils/renderers/renderParagraphNode.tsx'
                ],
                rules: ['react-doctor/no-danger', 'react-doctor/dangerous-html-sink']
            },
            {
                // JSON-LD script tags, value is escaped and built server-side
                files: ['**/app/layout.tsx', '**/packages/**/page.tsx'],
                rules: ['react-doctor/no-danger']
            },
            {
                // Satori cannot use CSS classes, OG cards must inline styles
                files: ['**/lib/og/card.tsx'],
                rules: ['react-doctor/no-inline-exhaustive-style']
            },
            {
                // server-side docs builder, not a security context
                files: ['**/lib/docs/builders/buildSignatureDetails.ts'],
                rules: ['react-doctor/insecure-crypto-risk']
            },
            {
                files: ['**/Tooltip.tsx'],
                rules: ['react-doctor/no-multi-comp']
            },
            {
                files: ['**/Icon.tsx'],
                rules: ['react-doctor/prefer-tag-over-role']
            },
            {
                files: ['**/Disclosure.tsx'],
                rules: ['react-doctor/no-derived-state', 'react-doctor/no-event-handler']
            },
            {
                files: ['**/Dropdown.tsx'],
                rules: [
                    'react-doctor/no-noninteractive-element-to-interactive-role',
                    'react-doctor/role-supports-aria-props'
                ]
            },
            {
                files: ['**/ScrollToTopButton.tsx'],
                rules: ['react-doctor/no-initialize-state']
            },
            {
                // scrollIntoView must run after the index-driven re-render, so it stays an effect
                files: ['**/components/search/command-palette/**'],
                rules: [
                    'react-doctor/prefer-tag-over-role',
                    'react-doctor/rerender-state-only-in-handlers',
                    'react-doctor/click-events-have-key-events',
                    'react-doctor/interactive-supports-focus',
                    'react-doctor/no-redundant-roles',
                    'react-doctor/no-event-handler'
                ]
            }
        ]
    },
    rules: {
        // knip alrdy does this
        'deslop/unused-export': 'off',
        'deslop/unused-dependency': 'off',
        'deslop/unused-dev-dependency': 'off',
        'react-doctor/nextjs-missing-metadata': 'off',
        // react compiler isn't enabled in the build, so the manual memos are still load-bearing
        'react-doctor/react-compiler-no-manual-memoization': 'off'
    }
});
