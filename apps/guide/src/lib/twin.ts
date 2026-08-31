import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';

import { CALLOUT_LABELS, TRANSPORT_LABELS } from '#lib/callout';
import { cleanFence } from '#lib/fence';
import { getServerManager, VERBS } from '#lib/packageManager';
import { refHref } from '#lib/refHref';
import { FENCE_MODES } from '#lib/rehypeFenceMeta';

import type { CalloutType, Transport } from '#lib/callout';
import type { Verb } from '#lib/packageManager';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Nodes } from 'mdast';

export interface TwinDocument {
    title: string;
    description?: string | undefined;
    body: string;
}

export function twinDocument({ title, description, body }: TwinDocument): string {
    const head = description === undefined ? `# ${title}` : `# ${title}\n\n${description}`;
    return `${head}\n\n${body.replace(/^\n+/, '')}`;
}

type JsxNode = MdxJsxFlowElement | MdxJsxTextElement;

function attribute(node: JsxNode, name: string): string | undefined {
    for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute' || attr.name !== name) continue;
        if (typeof attr.value === 'string') return attr.value;
    }
    return undefined;
}

function calloutLabel(node: JsxNode): string {
    const type = attribute(node, 'type') as CalloutType | undefined;
    const only = attribute(node, 'only') as Transport | undefined;

    if (only !== undefined) return TRANSPORT_LABELS[only];
    return type === undefined ? CALLOUT_LABELS.note : CALLOUT_LABELS[type];
}

function quoted(body: string): string {
    return body
        .split('\n')
        .map((line) => (line === '' ? '>' : `> ${line}`))
        .join('\n');
}

function shellCommand(node: JsxNode): string {
    const manager = getServerManager();
    const before = attribute(node, 'before');
    const lead = before === undefined ? '' : `${before}\n`;

    for (const verb of Object.keys(VERBS) as Verb[]) {
        const argument = attribute(node, verb);
        if (argument !== undefined) return `${lead}${VERBS[verb][manager]} ${argument}`;
    }
    return lead.trimEnd();
}

function isJsx(node: Nodes): node is JsxNode {
    return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

export const TWIN_OPTIONS: LLMsOptions = {
    headingIds: false,
    stringify(node, _parent, state, info) {
        if (node.type === 'code') {
            const { rest } = parseCodeBlockAttributes(node.meta ?? '', FENCE_MODES);
            const fence = [node.lang, rest.trim()].filter(Boolean).join(' ');
            return `\`\`\`${fence}\n${cleanFence(node.value)}\n\`\`\``;
        }

        if (!isJsx(node)) return undefined;

        switch (node.name) {
            case 'Ref': {
                const pkg = attribute(node, 'pkg') ?? '';
                const symbol = attribute(node, 'symbol') ?? '';
                return `[${state.containerPhrasing(node, info)}](${refHref(pkg, symbol)})`;
            }
            case 'Callout': {
                const body =
                    node.type === 'mdxJsxFlowElement'
                        ? state.containerFlow(node, info)
                        : state.containerPhrasing(node, info);
                return quoted(`**${calloutLabel(node)}**\n\n${body}`);
            }
            case 'Shell':
                return `\`\`\`sh\n${shellCommand(node)}\n\`\`\``;
            default:
                return undefined;
        }
    }
};
