import { highlightToHtml } from '@seedcord/ui/shiki';

import { InstallTabs } from '#components/InstallTabs';
import { MANAGERS, VERBS } from '#lib/packageManager';

import type { Manager, Verb } from '#lib/packageManager';
import type { ReactElement } from 'react';

export type InstallProps = Partial<Record<Verb, string>>;

function verbOf(props: InstallProps): [Verb, string] {
    const written = Object.entries(props).filter(([, argument]) => argument !== undefined);
    const [first] = written;

    if (written.length !== 1 || !first) {
        throw new Error(
            `Install takes exactly one of ${Object.keys(VERBS).join(', ')}. This one got ${written.length}.`
        );
    }

    return first as [Verb, string];
}

export async function Install(props: InstallProps): Promise<ReactElement> {
    const [verb, argument] = verbOf(props);

    const commands = {} as Record<Manager, string>;
    const html = {} as Record<Manager, string | null>;

    for (const manager of MANAGERS) commands[manager] = `${VERBS[verb][manager]} ${argument}`;

    const rendered = await Promise.all(MANAGERS.map((manager) => highlightToHtml(commands[manager], 'bash')));
    MANAGERS.forEach((manager, index) => (html[manager] = rendered[index] ?? null));

    return <InstallTabs commands={commands} html={html} />;
}
