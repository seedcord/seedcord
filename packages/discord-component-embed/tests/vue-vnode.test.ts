import { describe, expect, it } from 'vitest';

import { Container, TextDisplay, toComponentEmbed } from '#src/index';

import { inContainer, thrownBy } from './helpers';

// what vue 3.5's h() returns, trimmed to the fields vue's own isVNode and this package read
const vnode = { __v_isVNode: true, type: Container, props: null, children: { default: () => [] } };
const fragment = { __v_isVNode: true, type: Symbol.for('v-fgt'), props: null, children: [] };

describe('a vue vnode', () => {
    it.each([
        ['as the root', vnode],
        ['as a child', inContainer(vnode)],
        ['as a fragment', inContainer(fragment)],
        ['inside a text display', inContainer({ type: TextDisplay, props: { children: ['hi ', vnode] } })]
    ])('points at h() %s', (_label, tree) => {
        const error = thrownBy(() => toComponentEmbed(tree));

        expect(error.code).toBe('InvalidStructure');
        expect(error.message).toBe(
            "Got a Vue VNode. Build the tree with h() from discord-component-embed instead of Vue's h()."
        );
    });
});
