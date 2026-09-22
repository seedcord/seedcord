import { describe, expect, it } from 'vitest';

import { fromPayload, toComponentEmbed } from '#src/index';

import { thrownBy } from './helpers';

import type { EmbedElement } from '#src/index';

describe('fromPayload', () => {
    it.each([
        [
            "discord's full example",
            {
                component: {
                    type: 17,
                    spoiler: false,
                    accent_color: 1_752_220,
                    components: [
                        {
                            type: 9,
                            components: [{ type: 10, content: '# **[New version out!](https://example.com/v2)**' }],
                            accessory: { type: 2, style: 5, url: 'https://example.com/v2', label: 'Open' }
                        },
                        {
                            type: 12,
                            items: [
                                { media: { url: 'https://example.com/1.png' }, description: 'The dungeon' },
                                { media: { url: 'https://example.com/2.png' } }
                            ]
                        },
                        { type: 14, spacing: 1 },
                        {
                            type: 1,
                            components: [
                                { type: 2, style: 5, url: 'https://example.com/store', label: 'Store' },
                                { type: 2, style: 5, url: 'https://example.com/patch', label: 'Patch Notes' }
                            ]
                        },
                        { type: 14 },
                        {
                            type: 9,
                            components: [{ type: 10, content: 'Who could this be?' }],
                            accessory: { type: 11, media: { url: 'https://example.com/boss.png' }, spoiler: true }
                        }
                    ]
                }
            }
        ],
        [
            'the props that example leaves out',
            {
                component: {
                    type: 17,
                    components: [
                        { type: 14, spacing: 2, divider: false },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 5,
                                    url: 'https://example.com',
                                    emoji: { name: 'seedcord', id: '1538077321318236281', animated: true },
                                    disabled: true
                                }
                            ]
                        },
                        {
                            type: 12,
                            items: [{ media: { url: 'https://example.com/a.mp4' }, spoiler: true }]
                        }
                    ]
                }
            }
        ]
    ])('round-trips %s', (_label, payload) => {
        expect(toComponentEmbed(fromPayload(payload))).toEqual(payload);
    });
});

// JSON.parse output or a JS caller. TypeScript does not check these
const fromJson = fromPayload as (payload: unknown) => EmbedElement;

const IMAGE = 'https://example.com/image.png';
const text = { type: 10, content: 'hi' };
const inPayload = (...components: unknown[]): unknown => ({ component: { type: 17, components } });

describe('fromPayload keys', () => {
    // discord renders a component with an unknown key and drops the key
    it.each([
        [
            'a mistyped key on a component',
            inPayload({ type: 9, components: [text], accessory: { type: 11, media: { url: IMAGE }, descripton: 'x' } }),
            ['component', 'components', '0', 'accessory'],
            'A thumbnail doesn\'t take "descripton". Did you mean "description"? It takes type, id, media, description, and spoiler.'
        ],
        [
            'a mistyped key on a gallery item',
            inPayload({ type: 12, items: [{ media: { url: IMAGE }, spolier: true }] }),
            ['component', 'components', '0', 'items', '0'],
            'A gallery item doesn\'t take "spolier". Did you mean "spoiler"? It takes media, description, and spoiler.'
        ],
        [
            'a one-letter key that is two edits from id',
            inPayload({ ...text, x: 1 }),
            ['component', 'components', '0'],
            'A text display doesn\'t take "x". It takes type, id, and content.'
        ],
        [
            // discord falls back to the Open Graph card for any key past the six its docs list
            'an id on a button',
            inPayload({ type: 1, components: [{ type: 2, style: 5, url: 'https://example.com', label: 'go', id: 3 }] }),
            ['component', 'components', '0', 'components', '0'],
            'A button doesn\'t take "id". It takes type, style, url, label, emoji, and disabled.'
        ],
        [
            // discord's crawler rendered the button and dropped the unknown key
            'a mistyped key on a button emoji',
            inPayload({
                type: 1,
                components: [{ type: 2, style: 5, url: IMAGE, label: 'go', emoji: { name: '😀', animatd: true } }]
            }),
            ['component', 'components', '0', 'components', '0'],
            'A button\'s emoji doesn\'t take "animatd". Did you mean "animated"? It takes id, name, and animated.'
        ],
        [
            'an unknown key next to component',
            { component: { type: 17, components: [text] }, extra: true },
            [],
            'A component embed payload doesn\'t take "extra". It takes component.'
        ]
    ])('rejects %s', (_label, payload, path, message) => {
        const error = thrownBy(() => fromJson(payload));

        expect(error.code).toBe('InvalidProp');
        expect(error.path).toEqual(path);
        expect(error.message.split('\nFound at')[0]).toBe(message);
    });

    it("leaves the fields discord's API adds to media alone", () => {
        const media = { url: IMAGE, proxy_url: 'https://media.discordapp.net/x.png', width: 256, height: 256 };

        expect(() =>
            toComponentEmbed(fromJson(inPayload({ type: 9, components: [text], accessory: { type: 11, media } })))
        ).not.toThrow();
    });
});

describe('fromPayload ids', () => {
    const withIds = (containerId: unknown, textId: unknown): unknown => ({
        component: { type: 17, id: containerId, components: [{ type: 10, id: textId, content: 'hi' }] }
    });

    it.each([
        [0, 2_147_483_647],
        [1, 2]
    ])('accepts ids %s and %s and leaves them out of the payload', (containerId, textId) => {
        expect(toComponentEmbed(fromJson(withIds(containerId, textId)))).toEqual({
            component: { type: 17, components: [{ type: 10, content: 'hi' }] }
        });
    });

    // discord's crawler showed no preview at all for each of these
    it.each([-1, 2_147_483_648, 1.5, 'abc'])('rejects %s as an id', (id) => {
        const error = thrownBy(() => fromJson(withIds(1, id)));

        expect(error.code).toBe('InvalidProp');
        expect(error.path).toEqual(['component', 'components', '0']);
        expect(error.message.split('\nFound at')[0]).toBe(
            `An id has to be a whole number from 0 to 2147483647, got ${typeof id === 'string' ? `"${id}"` : String(id)}.`
        );
    });

    it('rejects an id another component already uses', () => {
        const error = thrownBy(() => fromJson(withIds(7, 7)));

        expect(error.code).toBe('InvalidProp');
        expect(error.path).toEqual(['component', 'components', '0']);
        expect(error.message.split('\nFound at')[0]).toBe(
            'Another component already has the id 7. No two components in an embed can share one.'
        );
    });
});

describe('fromPayload errors', () => {
    it.each([
        [
            'a payload that is not an object',
            'hello',
            [],
            'A component embed payload is an object like { "component": { "type": 17, ... } }, got "hello".'
        ],
        [
            'undefined in place of a payload',
            undefined,
            [],
            'A component embed payload is an object like { "component": { "type": 17, ... } }, got nothing.'
        ],
        [
            'a payload with no component',
            { components: [] },
            [],
            'A component embed payload is an object like { "component": { "type": 17, ... } }, got {"components":[]}.'
        ],
        [
            'a component that is not an object',
            inPayload(text, 'hi'),
            ['component', 'components', '1'],
            'A component has to be an object with a type, got "hi".'
        ],
        [
            'a type a component embed does not allow',
            inPayload(text, { type: 3, custom_id: 'pick' }),
            ['component', 'components', '1'],
            "Type 3 can't go in a component embed. It takes types 1, 2, 9, 10, 11, 12, 14, and 17."
        ],
        [
            'a button that is not a link button',
            inPayload({ type: 1, components: [{ type: 2, style: 1, custom_id: 'go', label: 'Go' }] }),
            ['component', 'components', '0', 'components', '0'],
            'A component embed only takes link buttons, which have style 5 and a url. This one has style 1.'
        ],
        [
            'a gallery item that is not an object',
            inPayload({ type: 12, items: [null] }),
            ['component', 'components', '0', 'items', '0'],
            'A gallery item has to be an object like { "media": { "url": "https://..." } }, got null.'
        ]
    ])('rejects %s and says where it is', (_label, payload, path, message) => {
        const error = thrownBy(() => fromJson(payload));

        expect(error.code).toBe('InvalidStructure');
        expect(error.path).toEqual(path);
        expect(error.message.split('\nFound at')[0]).toBe(message);
    });

    it('reports the tree checks at the JSON path of the component that broke', () => {
        const error = thrownBy(() =>
            toComponentEmbed(
                fromJson(inPayload(text, { type: 9, components: [{ type: 10, content: '' }], accessory: text }))
            )
        );

        expect(error.path).toEqual(['component', 'components', '1', 'components', '0']);
    });

    it('rejects a separator spacing in the numbers the JSON uses', () => {
        const error = thrownBy(() => fromJson(inPayload(text, { type: 14, spacing: 3 })));

        expect(error.code).toBe('InvalidProp');
        expect(error.path).toEqual(['component', 'components', '1']);
        expect(error.message).toBe(
            'A separator spacing has to be 1 (small) or 2 (large), got 3.\nFound at component > components > 1'
        );
    });

    // JSX accepts these shapes. discord's JSON does not
    it.each([
        [
            'a number as content',
            inPayload({ type: 10, content: 5 }),
            ['component', 'components', '0'],
            "A text display's content has to be a string, got 5."
        ],
        [
            'an array as content',
            inPayload({ type: 10, content: ['a', 'b'] }),
            ['component', 'components', '0'],
            'A text display\'s content has to be a string, got ["a","b"].'
        ],
        [
            'a text display with no content',
            inPayload({ type: 10 }),
            ['component', 'components', '0'],
            "A text display's content has to be a string, got nothing."
        ],
        [
            'a string as a button emoji',
            inPayload({ type: 1, components: [{ type: 2, style: 5, url: IMAGE, label: 'go', emoji: '😀' }] }),
            ['component', 'components', '0', 'components', '0'],
            'A button\'s emoji has to be an object like { "name": "😀" }, got "😀".'
        ],
        [
            'a string as a thumbnail media',
            inPayload({ type: 9, components: [text], accessory: { type: 11, media: IMAGE } }),
            ['component', 'components', '0', 'accessory'],
            `A thumbnail's media has to be an object like { "url": "https://..." }, got "${IMAGE}".`
        ],
        [
            'a string as a container list',
            { component: { type: 17, components: 'abc' } },
            ['component'],
            'A container\'s "components" has to be an array, got "abc".'
        ],
        [
            'an object as a gallery list',
            inPayload({ type: 12, items: {} }),
            ['component', 'components', '0'],
            'A media gallery\'s "items" has to be an array, got {}.'
        ],
        [
            'a gallery item with no media',
            inPayload({ type: 12, items: [{ description: 'alt' }] }),
            ['component', 'components', '0', 'items', '0'],
            'A gallery item\'s media has to be an object like { "url": "https://..." }, got nothing.'
        ]
    ])('rejects %s', (_label, payload, path, message) => {
        const error = thrownBy(() => fromJson(payload));

        expect(error.code).toBe('InvalidProp');
        expect(error.path).toEqual(path);
        expect(error.message.split('\nFound at')[0]).toBe(message);
    });

    // discord-api-types allows null here
    it('accepts a null accent_color and leaves it out', () => {
        expect(toComponentEmbed(fromJson({ component: { type: 17, accent_color: null, components: [text] } }))).toEqual(
            {
                component: { type: 17, components: [text] }
            }
        );
    });

    it('reports a type a component embed does not allow before a bad id on it', () => {
        const error = thrownBy(() => fromJson(inPayload({ type: 3, id: -1 })));

        expect(error.message).toMatch(/^Type 3 can't go in a component embed\./);
    });

    it('says a button with no url got nothing', () => {
        const button = { type: 2, style: 5, label: 'go' };

        const error = thrownBy(() => toComponentEmbed(fromJson(inPayload({ type: 1, components: [button] }))));

        expect(error.message.split('\nFound at')[0]).toBe(
            'The <LinkButton> url must be an http, https, or discord URL, got nothing.'
        );
    });

    it('lets the tree report a section with no accessory', () => {
        const error = thrownBy(() => toComponentEmbed(fromJson(inPayload({ type: 9, components: [text] }))));

        expect(error.path).toEqual(['component', 'components', '0']);
        expect(error.message).toBe(
            'A <Section> needs exactly one accessory, a <Thumbnail> or a <LinkButton>, got none.\nFound at component > components > 0'
        );
    });
});
