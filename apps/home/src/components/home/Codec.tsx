import { cn, PosterSection, SECTION_HEADING } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { CustomIdDemo } from '#components/home/CustomIdDemo';
import { Code } from '#components/ui/Code';
import { CODE_MARK_DARK } from '#lib/code/marks';
import { codecComponent, codecHandler } from '#lib/code/samples';

import type { ReactNode } from 'react';

export function Codec(): ReactNode {
    return (
        <PosterSection ground="flesh">
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
                </div>
            </div>
            <div className={cn('mt-10')}>
                <CustomIdDemo
                    component={
                        <CodeCard
                            code={codecComponent}
                            filename="components/ticket.ts"
                            note="component"
                            className={cn('blk-pith rule')}
                        />
                    }
                    handler={
                        <CodeCard
                            code={codecHandler}
                            filename="handlers/ticket.ts"
                            note="button handler"
                            className={cn('blk-pith rule')}
                        />
                    }
                />
            </div>
        </PosterSection>
    );
}
