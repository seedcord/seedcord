import { describe, expect, it } from 'vitest';

import { resolveMemberDeprecation } from '#lib/docs/builders/utils';

import type { DocNodeLike } from '#lib/docs/builders/utils';
import type { DeprecationStatus } from '#lib/docs/types';

function node(isDeprecated: boolean, blockText?: string): DocNodeLike {
    return {
        flags: { isDeprecated },
        comment: blockText === undefined ? undefined : { blockTags: [{ tag: '@deprecated', text: blockText }] }
    } as unknown as DocNodeLike;
}

const withMessage: DeprecationStatus = {
    isDeprecated: true,
    deprecationMessage: [{ plain: 'Call publish.', html: 'Call publish.' }]
};

describe('resolveMemberDeprecation', () => {
    it('takes the message off the signature when the member node carries the flag alone', () => {
        const status = resolveMemberDeprecation(node(true), [{ deprecationStatus: withMessage }]);

        expect(status).toEqual(withMessage);
    });

    it('keeps the member message when the node has one', () => {
        const status = resolveMemberDeprecation(node(true, 'Member text.'), [{ deprecationStatus: withMessage }]);

        expect(status.isDeprecated && status.deprecationMessage?.[0]?.plain).toBe('Member text.');
    });

    it('reports nothing for a member that is not deprecated', () => {
        expect(resolveMemberDeprecation(node(false), [{ deprecationStatus: withMessage }])).toEqual({
            isDeprecated: false
        });
    });
});
