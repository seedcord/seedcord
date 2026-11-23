import { defineConfig } from 'react-doctor/api';

export default defineConfig({
    ignore: {
        // devSource only feeds the dev pages ignored on the line above
        files: ['**/app/dev/**', '**/tests/**', '**/lib/devSource.ts', '**/dist/**'],

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
                // content comes only from shiki highlighting and rendered TSDoc, generated at build time
                files: [
                    '**/CodeBlock.tsx',
                    '**/CodePanel.tsx',
                    '**/components/code/CodeCard.tsx',
                    '**/components/docs/ReadmeBlock.tsx',
                    '**/components/docs/entity/comments/CommentParagraphs.tsx',
                    '**/components/docs/entity/enums/EnumMemberCard.tsx',
                    '**/components/docs/entity/member/MemberRowBody.tsx',
                    '**/components/docs/entity/utils/renderers/renderParagraphNode.tsx',
                    '**/components/TypeHover.tsx'
                ],
                rules: ['react-doctor/no-danger', 'react-doctor/dangerous-html-sink']
            },
            {
                // setVersion writes shared engine state. the versions load one at a time
                files: ['**/lib/docs/DocsRoute.ts'],
                rules: ['react-doctor/async-await-in-loop']
            },
            {
                // Button asChild merges the aria-label onto the anchor
                files: ['**/components/docs/entity/EntityHeader.tsx'],
                rules: ['react-doctor/control-has-associated-label']
            },
            {
                // the fetch chain already ends in .catch
                files: ['**/useCommandPaletteController.ts'],
                rules: ['react-doctor/no-promise-then-side-effect-in-effect-without-catch']
            },
            {
                // isFirst and isLast carry roving-list position into useActiveRowScroll
                files: ['**/CommandPaletteDialog.tsx'],
                rules: ['react-doctor/no-many-boolean-props']
            },
            {
                // next/image demands width and height, both optional on this component's props
                files: ['**/lib/mdxComponents.tsx'],
                rules: ['react-doctor/nextjs-no-img-element']
            },
            {
                // JSON-LD script tags, value is escaped and built server-side
                files: ['**/app/layout.tsx', '**/packages/**/page.tsx'],
                rules: ['react-doctor/no-danger']
            },
            {
                // og cards render with none of the site's css
                files: ['**/lib/og/card.tsx'],
                rules: ['react-doctor/no-inline-exhaustive-style']
            },
            {
                // next/image emits a single src under the export's unoptimized flag
                files: ['**/components/home/DevTui.tsx'],
                rules: ['react-doctor/nextjs-no-img-element']
            },
            {
                // the docs builder runs this server-side, with no security exposure
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
                // scrollIntoView must run after the index-driven re-render. that keeps it as an effect
                files: ['**/components/search/command-palette/**'],
                rules: [
                    'react-doctor/prefer-tag-over-role',
                    'react-doctor/rerender-state-only-in-handlers',
                    'react-doctor/click-events-have-key-events',
                    'react-doctor/interactive-supports-focus',
                    'react-doctor/no-redundant-roles',
                    'react-doctor/no-event-handler'
                ]
            },
            {
                // the same callback ref that calls observe() disconnects the previous observer
                // the result panel grows from zero to its measured height
                files: ['**/SearchDialog.tsx'],
                rules: ['react-doctor/effect-needs-cleanup', 'react-doctor/no-layout-property-animation']
            },
            {
                // the animated height belongs to an svg rect inside a clipPath
                files: ['**/TableOfContents.tsx'],
                rules: ['react-doctor/no-layout-property-animation']
            },
            {
                // react 19 calls the cleanup a ref callback returns
                files: ['**/useSidebarPersistence.tsx'],
                rules: ['react-doctor/effect-needs-cleanup']
            },
            {
                // prompts ask one question at a time and the dev loop runs one session after another
                files: ['**/make/InputQuestions.ts', '**/dev/DevRunner.ts'],
                rules: ['react-doctor/async-await-in-loop']
            },
            {
                // ink reads two keys left in the stream together as one pasted string
                files: ['**/PromptTerminal.ts'],
                rules: ['react-doctor/async-await-in-loop']
            },
            {
                // import order sets the order of the generated types
                files: ['**/modules/CommandScanner.ts', '**/codegen/PluginTypesCollector.ts'],
                rules: ['react-doctor/async-await-in-loop']
            },
            {
                // bulk deletes go one call at a time to keep under discord's rate limit
                files: ['**/commands/DiscordSession.ts'],
                rules: ['react-doctor/async-await-in-loop']
            },
            {
                // FolderBucket reads a failed open as a missing page, which would report a good link as broken
                files: ['**/export/LinkChecker.ts'],
                rules: ['react-doctor/async-await-in-loop']
            },
            {
                // the step printer shows these lines in order
                files: ['**/codegen/CodegenRunner.ts'],
                rules: ['react-doctor/server-sequential-independent-await']
            },
            {
                files: ['**/modules/ModuleExports.ts'],
                rules: ['react-doctor/js-combine-iterations']
            },
            {
                // at most 7 keys
                files: ['**/fromPayload.ts'],
                rules: ['react-doctor/js-combine-iterations', 'react-doctor/js-set-map-lookups']
            },
            {
                // a rel attribute holds a few tokens
                files: ['src/check.ts'],
                rules: ['react-doctor/js-set-map-lookups']
            },
            {
                // scriptSafeJson escapes < before the json reaches the script tag
                files: ['**/react.index.ts'],
                rules: ['react-doctor/dangerous-html-sink']
            },
            {
                // freePort closes this socket as soon as it reads the port number
                files: ['**/tunnel/CloudflaredTunnel.ts'],
                rules: ['react-doctor/local-rpc-native-bridge-risk']
            },
            {
                // a malformed NEXT_PUBLIC_SITE_ORIGIN should stop the build
                files: ['src/sites.ts'],
                rules: ['react-doctor/no-unguarded-throwing-parse-call']
            },
            {
                // outcome comes out of the reducer, which can't call onEnd itself
                files: ['**/usePrompt.ts'],
                rules: ['react-doctor/no-pass-data-to-parent']
            }
        ]
    },
    rules: {
        // knip alrdy does this
        'deslop/unused-export': 'off',
        'deslop/unused-dependency': 'off',
        'deslop/unused-dev-dependency': 'off',
        'react-doctor/nextjs-missing-metadata': 'off',
        // the build does not run the react compiler. the manual memos still matter
        'react-doctor/react-compiler-no-manual-memoization': 'off'
    }
});
