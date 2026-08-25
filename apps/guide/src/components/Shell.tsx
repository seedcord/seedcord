import { highlightToHtml } from '@seedcord/ui/shiki';

import { ShellTabs } from '#components/ShellTabs';
import { MANAGERS, VERBS } from '#lib/packageManager';

import type { Manager, Verb } from '#lib/packageManager';
import type { ReactElement } from 'react';

export type ShellProps = Partial<Record<Verb, string>> & {
    /** Lines to put above the command, inside the same block. */
    before?: string;
};

function verbOf({ before, ...verbs }: ShellProps): [Verb, string] {
    const written = Object.entries(verbs).filter(([, argument]) => argument !== undefined);
    const [first] = written;

    if (written.length !== 1 || !first) {
        throw new Error(`Shell takes exactly one of ${Object.keys(VERBS).join(', ')}. This one got ${written.length}.`);
    }

    return first as [Verb, string];
}

export async function Shell(props: ShellProps): Promise<ReactElement> {
    const [verb, argument] = verbOf(props);
    const lead = props.before === undefined ? '' : `${props.before}\n`;

    const commands = {} as Record<Manager, string>;
    const html = {} as Record<Manager, string | null>;

    for (const manager of MANAGERS) commands[manager] = `${lead}${VERBS[verb][manager]} ${argument}`;

    const rendered = await Promise.all(MANAGERS.map((manager) => highlightToHtml(commands[manager], 'bash')));
    MANAGERS.forEach((manager, index) => (html[manager] = rendered[index] ?? null));

    return <ShellTabs commands={commands} html={html} />;
}
