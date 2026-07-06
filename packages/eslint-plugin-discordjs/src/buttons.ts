import { calleeProperty, getProperty, lastCall } from '@seedcord/eslint-utils';

import type { TSESTree } from '@typescript-eslint/utils';

// stable Discord wire values, keyed for the message text
export const STYLE_NAMES: Record<number, string> = {
    1: 'Primary',
    2: 'Secondary',
    3: 'Success',
    4: 'Danger',
    5: 'Link',
    6: 'Premium'
};
export const LINK = 5;
export const PREMIUM = 6;

export type ButtonProp = 'customId' | 'label' | 'url' | 'emoji' | 'skuId';

// each prop's setter and its snake_case constructor data key. discord.js also accepts the
// camelCase form (the prop name itself) and snake_cases it at construction
const PROP_SOURCES = [
    ['customId', 'setCustomId', 'custom_id'],
    ['label', 'setLabel', 'label'],
    ['url', 'setURL', 'url'],
    ['emoji', 'setEmoji', 'emoji'],
    ['skuId', 'setSKUId', 'sku_id']
] as const satisfies readonly (readonly [ButtonProp, string, string])[];

export interface ButtonFacts {
    props: Map<ButtonProp, TSESTree.Node>;
    styleSource: TSESTree.CallExpressionArgument | TSESTree.Property['value'] | undefined;
}

export function gatherFacts(
    calls: TSESTree.CallExpression[],
    data: TSESTree.ObjectExpression | undefined
): ButtonFacts {
    const props = new Map<ButtonProp, TSESTree.Node>();
    for (const [prop, method, key] of PROP_SOURCES) {
        const call = lastCall(calls, method);
        const site =
            call !== undefined
                ? calleeProperty(call)
                : data === undefined
                  ? undefined
                  : (getProperty(data, key) ?? getProperty(data, prop));
        if (site !== undefined) props.set(prop, site);
    }
    // a chained setStyle runs after the constructor, so it wins over a data style
    const styleSource =
        lastCall(calls, 'setStyle')?.arguments[0] ??
        (data === undefined ? undefined : getProperty(data, 'style')?.value);
    return { props, styleSource };
}
