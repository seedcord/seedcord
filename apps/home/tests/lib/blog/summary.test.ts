import { describe, expect, it } from 'vitest';

import { listedNewestFirst } from '#lib/blog/summary';
import { POST } from '#tests/fixtures/post';

describe('listedNewestFirst', () => {
    it('leaves out unlisted posts and puts the newest first', () => {
        const older = { ...POST, slug: 'older', created: '2026-01-01' };
        const newer = { ...POST, slug: 'newer', created: '2026-03-01' };
        const draft = { ...POST, slug: 'draft', created: '2026-05-01', unlisted: true };

        expect(listedNewestFirst([older, draft, newer]).map((post) => post.slug)).toEqual(['newer', 'older']);
    });
});
