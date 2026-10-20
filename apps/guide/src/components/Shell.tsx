import { highlightToHtml } from '@seedcord/ui/shiki';

import { ShellTabs } from '#components/ShellTabs';
import { commandLines, MANAGERS, VERBS } from '#lib/packageManager';

import type { Manager, Verb } from '#lib/packageManager';
import type { ReactElement } from 'react';

export type ShellProps = Partial<Record<Verb, string>> & {
    /** Lines to put above the command, inside the same block. */
    before?: string;
};

function verbsOf({ before: _before, ...verbs }: ShellProps): [Verb, string][] {
    const written = Object.entries(verbs) as [Verb, string][];

    if (written.length === 0) {
        throw new Error(`Shell takes at least one of ${Object.keys(VERBS).join(', ')}.`);
    }

    return written;
}

export async function Shell(props: ShellProps): Promise<ReactElement> {
    const verbs = verbsOf(props);
    const lead = props.before === undefined ? '' : `${props.before}\n`;

    const commands = {} as Record<Manager, string>;
    const html = {} as Record<Manager, string | null>;

    for (const manager of MANAGERS) commands[manager] = `${lead}${commandLines(verbs, manager)}`;

    const rendered = await Promise.all(MANAGERS.map((manager) => highlightToHtml(commands[manager], 'bash')));
    MANAGERS.forEach((manager, index) => (html[manager] = rendered[index] ?? null));

    return <ShellTabs commands={commands} html={html} />;
}
