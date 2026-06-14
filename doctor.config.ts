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
                files: [
                    '**/CodeBlock.tsx',
                    '**/CodePanel.tsx',
                    '**/components/docs/entity/comments/CommentParagraphs.tsx',
                    '**/components/docs/entity/enums/EnumMemberCard.tsx',
                    '**/components/docs/entity/utils/renderers/renderParagraphNode.tsx'
                ],
                rules: ['react-doctor/no-danger']
            },
            { files: ['**/Tooltip.tsx'], rules: ['react-doctor/no-multi-comp'] },
            { files: ['**/Icon.tsx'], rules: ['react-doctor/prefer-tag-over-role'] },
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
            { files: ['**/ScrollToTopButton.tsx'], rules: ['react-doctor/no-initialize-state'] },
            {
                files: ['**/components/search/command-palette/**'],
                rules: [
                    'react-doctor/prefer-tag-over-role',
                    'react-doctor/rerender-state-only-in-handlers',
                    'react-doctor/click-events-have-key-events',
                    'react-doctor/interactive-supports-focus',
                    'react-doctor/no-redundant-roles'
                ]
            }
        ]
    },
    // knip alrdy does this
    rules: {
        'deslop/unused-export': 'off',
        'deslop/unused-dependency': 'off',
        'deslop/unused-dev-dependency': 'off',
        'react-doctor/nextjs-missing-metadata': 'off'
    }
});
