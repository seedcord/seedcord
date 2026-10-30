import { describe, expect, it } from 'vite-plus/test';

import { rssFeed } from '#lib/blog/feed.ts';
import { POST } from '#tests/fixtures/post';

describe('rssFeed', () => {
    it('escapes markup in a title', () => {
        const feed = rssFeed([{ ...POST, title: 'Tips & <tricks>' }]);

        expect(feed).toContain('<title>Tips &amp; &lt;tricks&gt;</title>');
    });
});
