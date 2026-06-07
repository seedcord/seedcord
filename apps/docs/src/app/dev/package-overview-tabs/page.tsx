import { cn } from '@seedcord/ui';

import { PackageOverviewTabs } from '@components/docs/PackageOverviewTabs';
import { ReadmeBlock } from '@components/docs/ReadmeBlock';
import { renderReadme } from '@lib/docs/renderReadme';

import type { ReactElement, ReactNode } from 'react';

const SAMPLE_README = `<p align="center"><img src="https://raw.githubusercontent.com/seedcord/seedcord/main/assets/banner.png" alt="seedcord" width="100%" /></p>

---

_This repository is a work in progress._

- There are no stable releases yet but changes are being made actively.
- Till a major v1.0.0 release for seedcord, expect breaking changes in minor versions.
- Documentation will come soon as well!

If you'd like to try it out, you can check out the code in \`mock\`.
`;

const LONG_README = `# @seedcord/utils

Utility helpers used across the seedcord framework.

## Installation

\`\`\`sh
pnpm add @seedcord/utils
\`\`\`

## Usage

\`\`\`ts
import { round } from '@seedcord/utils';

round(1.2345, 2); // 1.23
\`\`\`

## Features

- **numbers**: \`round\`, \`ordinal\`, \`percentage\`
- **strings**: \`prettify\`
- **objects**: \`keepDefined\`, \`filterCirculars\`

> Note: pre-1.0, public APIs may change between minors.

| Export | Kind |
| --- | --- |
| round | function |
| ordinal | function |
`;

function DevSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function MockReference(): ReactElement {
    const entities = ['Bot', 'Seedcord', 'Lifecycle', 'CooldownManager', 'Logger', 'round', 'ordinal', 'prettify'];
    return (
        <div className={cn('flex flex-wrap gap-2')}>
            {entities.map((entity) => (
                <span
                    key={entity}
                    className={cn(
                        'rounded-xl border border-(--border) bg-(--surface-subtle) px-3 py-1.5 text-sm text-(--text)'
                    )}
                >
                    {entity}
                </span>
            ))}
        </div>
    );
}

async function PackageOverviewTabsPage(): Promise<ReactElement> {
    const [shortHtml, longHtml] = await Promise.all([renderReadme(SAMPLE_README), renderReadme(LONG_README)]);

    return (
        <div className={cn('space-y-10 pb-32')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>PackageOverviewTabs</h1>
                <p className={cn('text-subtle text-sm')}>
                    README | Reference Overview segmented toggle above the entities list. README is the default tab; the
                    README option is disabled when a version has no README.
                </p>
            </header>
            <DevSection title="With README (default tab = README)">
                <PackageOverviewTabs
                    title="seedcord"
                    version="v0.11.0"
                    readme={<ReadmeBlock html={shortHtml} />}
                    reference={<MockReference />}
                />
            </DevSection>
            <DevSection title="Long README (headings, list, code, table, blockquote)">
                <PackageOverviewTabs
                    title="seedcord"
                    version="v0.11.0"
                    readme={<ReadmeBlock html={longHtml} />}
                    reference={<MockReference />}
                />
            </DevSection>
            <DevSection title="No README (option disabled, defaults to Reference Overview)">
                <PackageOverviewTabs title="seedcord" version="v0.11.0" readme={null} reference={<MockReference />} />
            </DevSection>
        </div>
    );
}

export default PackageOverviewTabsPage;
