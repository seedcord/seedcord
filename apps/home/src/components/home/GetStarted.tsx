import { stageNotice } from '@seedcord/brand';
import { cn, PosterButton, PosterSection, SECTION_HEADING_LG } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { SiteLink } from '#components/ui/SiteLink';
import { startTerminal } from '#lib/code/samples';
import { DISCORD_URL, GUIDE_URL } from '#lib/site';

import type { ReactNode } from 'react';

export function GetStarted(): ReactNode {
    return (
        <PosterSection ground="ink">
            <div className={cn('grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]')}>
                <div>
                    <h2 className={cn(SECTION_HEADING_LG)}>
                        From zero
                        <br />
                        to <span className={cn('text-(--flesh)')}>hot reload</span>.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg font-medium text-(--pith)/80')}>
                        Scaffold a typed bot, open it, and run it. seedcord sends each interaction to its handler,
                        registers your commands, and types every option. A saved handler reloads in place without
                        restarting your bot.
                    </p>
                    <div className={cn('mt-8 flex flex-wrap gap-3')}>
                        <PosterButton variant="solid">
                            <SiteLink href={GUIDE_URL}>Read the guide</SiteLink>
                        </PosterButton>
                        <PosterButton variant="outline">
                            <SiteLink href={DISCORD_URL}>Join the Discord</SiteLink>
                        </PosterButton>
                    </div>
                    <p className={cn('mt-8 max-w-md text-sm text-(--pith)/65')}>{stageNotice('your bot')}</p>
                </div>
                <CodeCard
                    code={startTerminal}
                    filename="terminal"
                    lang="bash"
                    copyable
                    className={cn('blk-pith rule-pith')}
                />
            </div>
        </PosterSection>
    );
}
