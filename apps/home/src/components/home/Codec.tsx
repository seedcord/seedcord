import { cn, Icon } from '@seedcord/ui';
import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_DARK } from '#lib/code/marks';
import { codecComponent, codecHandler } from '#lib/code/samples';

import type { ReactNode } from 'react';

const CHIPS = [
    { icon: ArrowRightFromLine, label: 'encode(values) to string' },
    { icon: ArrowLeftFromLine, label: 'decode(id) to typed values' }
] as const;

export function Codec(): ReactNode {
    return (
        <Section ground="flesh">
            <div className={cn('grid items-start gap-x-10 gap-y-6 lg:grid-cols-2')}>
                <h2 className={cn(SECTION_HEADING)}>
                    Discord hands back a flat string.
                    <br />
                    You get your typed fields.
                </h2>
                <div className={cn('min-w-0')}>
                    <p className={cn('text-lg/snug font-medium text-(--pith)')}>
                        A click arrives carrying the custom id you set, as one string. Split it yourself and every field
                        comes back as <Code className={cn(CODE_MARK_DARK)}>string</Code>.
                    </p>
                    <p className={cn('mt-4 text-lg/snug font-medium text-(--pith)')}>
                        <Code className={cn(CODE_MARK_DARK)}>CustomId</Code> declares those fields once.{' '}
                        <Code className={cn(CODE_MARK_DARK)}>this.params</Code> then returns each one at its real type.
                    </p>
                    <p className={cn('mt-4 text-lg/snug font-medium text-(--pith)')}>
                        Discord caps that string at 100 characters. The codec packs your fields into fewer of them than
                        joining the values would.
                    </p>
                    <div className={cn('mt-6 flex flex-wrap gap-2')}>
                        {CHIPS.map((chip) => (
                            <span
                                key={chip.label}
                                className={cn(
                                    'rule-pith font-mono-code flex items-center gap-2 rounded-sm bg-(--seed-dark)/30 px-3 py-1.5 text-xs font-semibold'
                                )}
                            >
                                <Icon icon={chip.icon} size={14} className={cn('shrink-0')} />
                                {chip.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            {/* columns and gutter match the text grid above */}
            <div className={cn('mt-10 grid gap-x-10 gap-y-5 lg:grid-cols-2')}>
                <CodeCard
                    code={codecComponent}
                    filename="components/role-picker.ts"
                    note="component"
                    className={cn('rule-pith blk-pith')}
                />
                <CodeCard
                    code={codecHandler}
                    filename="handlers/role-picker.ts"
                    note="select handler"
                    className={cn('rule-pith blk-pith')}
                />
            </div>
        </Section>
    );
}
