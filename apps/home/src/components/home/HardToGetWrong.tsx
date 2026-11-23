import { cn } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { MistakePicker } from '#components/home/MistakePicker';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_LIGHT } from '#lib/code/marks';
import {
    mistakeCustomId,
    mistakeDecorator,
    mistakeDuplicate,
    mistakeFixed,
    mistakeOption,
    mistakeReply,
    mistakeRoute
} from '#lib/code/samples';
import { ERROR_CODE_COUNT, LINT_RULE_COUNT } from '#lib/volume';

import type { Attempt } from '#components/home/MistakePicker';
import type { ReactNode } from 'react';

const TSC = 'tsc --noEmit';
const ESLINT = 'eslint src';

// each output is what that command printed for the same code in the gateway mock bot
const MISTAKES: { attempt: Attempt; code: string; filename: string }[] = [
    {
        attempt: {
            id: 'route',
            label: 'route',
            stage: 'compiler',
            wrong: "'prob'",
            command: TSC,
            output: `src/handlers/search.ts(2,2): error TS1238: Unable to resolve signature of class decorator when called as an expression.\n  Type 'Search' is not assignable to type '["SlashRoute lists an unregistered command", "prob"]'.`
        },
        code: mistakeRoute,
        filename: 'handlers/search.ts'
    },
    {
        attempt: {
            id: 'option',
            label: 'option',
            stage: 'compiler',
            wrong: "'qury'",
            command: TSC,
            output: `src/handlers/search.ts(7,24): error TS2345: Argument of type '"qury"' is not assignable to parameter of type 'NamesOfKind<"probe", "string">'.`
        },
        code: mistakeOption,
        filename: 'handlers/search.ts'
    },
    {
        attempt: {
            id: 'reply',
            label: 'reply',
            stage: 'lint',
            wrong: 'event.reply',
            command: ESLINT,
            output: 'src/handlers/search.ts\n  7:15  error  Reply through this.reply()  @seedcord/no-raw-interaction-acks'
        },
        code: mistakeReply,
        filename: 'handlers/search.ts'
    },
    {
        attempt: {
            id: 'custom-id',
            label: 'custom id',
            stage: 'lint',
            wrong: '`more:${page}`',
            command: ESLINT,
            output: 'src/handlers/search.ts\n  7:26  error  Hand-written customId. Build it through the typed CustomId codec (CustomId.encode()) so the handler can decode its route and params  @seedcord/use-custom-id-codec'
        },
        code: mistakeCustomId,
        filename: 'handlers/search.ts'
    },
    {
        attempt: {
            id: 'decorator',
            label: 'decorator',
            stage: 'lint',
            wrong: 'Recent',
            command: ESLINT,
            output: 'src/handlers/recent.ts\n  3:14  error  This SlashHandler is missing @SlashRoute, so it never registers and its interactions fall through to the unhandled default  @seedcord/interaction-handler-missing-route'
        },
        code: mistakeDecorator,
        filename: 'handlers/recent.ts'
    },
    {
        attempt: {
            id: 'duplicate',
            label: 'duplicate',
            stage: 'startup',
            wrong: "'ping'",
            command: 'seedcord codegen',
            output: '[1228] src/commands/Ping.ts and src/commands/Pong.ts define the slash route "ping". Rename one.\n\n$ seedcord ask 1228\n1228 is CoreDuplicateName\nCodegen (Tooling): seedcord.org/guide/tooling/codegen.md\n  - Two commands, one name'
        },
        code: mistakeDuplicate,
        filename: 'commands/Pong.ts'
    },
    {
        attempt: {
            id: 'fixed',
            label: 'fixed',
            stage: 'Discord',
            command: `${TSC} && ${ESLINT}`,
            output: '$ seedcord dev\n[trace]: Dispatch - slash:probe handled in 301ms'
        },
        code: mistakeFixed,
        filename: 'handlers/search.ts'
    }
];

const TOOLING = [
    { term: 'seedcord ask', does: 'searches the guide with a question, a pasted error, or an error code.' },
    { term: 'seedcord dev', does: 'logs JSON and takes commands on stdin without a terminal.' },
    { term: 'pnpm create seedcord', does: 'has a flag for every question.' },
    { term: 'AGENTS.md', does: 'comes with every new project, beside a skill and llms.txt.' }
] as const;

export function HardToGetWrong(): ReactNode {
    return (
        <Section ground="pith">
            <div className={cn('grid items-start gap-x-10 gap-y-8 lg:grid-cols-[0.9fr_1.1fr]')}>
                <div className={cn('min-w-0')}>
                    <h2 className={cn(SECTION_HEADING)}>
                        Hard to get wrong, by you or <span className={cn('text-(--flesh-deep)')}>your agent</span>.
                    </h2>
                    <div
                        className={cn(
                            'mt-6 grid items-start gap-x-10 gap-y-6 md:max-lg:grid-cols-2 md:max-lg:grid-rows-[auto_1fr] lg:max-w-md'
                        )}
                    >
                        <p className={cn('text-lg/snug font-medium text-(--seed-dark)/85')}>
                            The compiler rejects a wrong route or option name. {LINT_RULE_COUNT} lint rules catch what
                            still compiles, and {ERROR_CODE_COUNT} coded errors say what went wrong, where, and how to
                            fix it.
                        </p>
                        <dl
                            className={cn(
                                'divide-y divide-(--seed-dark)/15 border-y border-(--seed-dark)/15',
                                'md:max-lg:col-start-2 md:max-lg:row-span-2 md:max-lg:row-start-1 md:max-lg:border-t-0'
                            )}
                        >
                            {TOOLING.map((tool) => (
                                <div
                                    key={tool.term}
                                    className={cn('py-3 font-medium text-(--seed-dark)/85 md:max-lg:first:pt-0')}
                                >
                                    <dt className={cn('inline')}>
                                        <Code className={cn(CODE_MARK_LIGHT)}>{tool.term}</Code>
                                    </dt>{' '}
                                    <dd className={cn('inline')}>{tool.does}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className={cn('text-sm font-medium text-(--seed-dark)/60')}>
                            Reading this as an agent? Start at{' '}
                            <Code className={cn(CODE_MARK_LIGHT)}>seedcord.org/llms.txt</Code>.
                        </p>
                    </div>
                </div>
                <MistakePicker
                    attempts={MISTAKES.map((mistake) => mistake.attempt)}
                    cards={MISTAKES.map(({ attempt, code, filename }) => (
                        <CodeCard key={attempt.id} code={code} filename={filename} />
                    ))}
                />
            </div>
        </Section>
    );
}
