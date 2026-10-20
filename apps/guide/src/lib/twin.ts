import { absoluteUrl } from '@seedcord/ui';
import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';
import { defaultHandlers } from 'mdast-util-to-markdown';

import { CALLOUT_LABELS, TRANSPORT_LABELS } from '#lib/callout';
import { cleanFence } from '#lib/fence';
import { commandLines, getServerManager, isVerb } from '#lib/packageManager';
import { FENCE_MODES } from '#lib/rehypeFenceMeta';
import { canonicalUrl } from '#lib/site';

import type { CalloutType, Transport } from '#lib/callout';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Nodes } from 'mdast';

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

    const verbs = node.attributes.flatMap((attr) =>
        attr.type === 'mdxJsxAttribute' && isVerb(attr.name) && typeof attr.value === 'string'
            ? [[attr.name, attr.value] as const]
            : []
    );
    return verbs.length === 0 ? lead.trimEnd() : `${lead}${commandLines(verbs, manager)}`;
}

function isJsx(node: Nodes): node is JsxNode {
    return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

export const TWIN_OPTIONS: LLMsOptions = {
    headingIds: false,
    handlers: {
        link(node, parent, state, info) {
            return defaultHandlers.link({ ...node, url: absoluteUrl(node.url, canonicalUrl) }, parent, state, info);
        }
    },
    stringify(node, _parent, state, info) {
        if (node.type === 'code') {
            const { rest } = parseCodeBlockAttributes(node.meta ?? '', FENCE_MODES);
            const fence = [node.lang, rest.trim()].filter(Boolean).join(' ');
            return `\`\`\`${fence}\n${cleanFence(node.value)}\n\`\`\``;
        }

        if (!isJsx(node)) return undefined;

        switch (node.name) {
            case 'Ref':
                return `[${state.containerPhrasing(node, info)}](${attribute(node, 'href') ?? ''})`;
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
