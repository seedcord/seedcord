<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

<div align="center">
  <h3>The whole Discord bot, wired and typed</h3>
  <a href="https://seedcord.org">Website</a> ·
  <a href="https://guide.seedcord.org">Guide</a> ·
  <a href="https://docs.seedcord.org">Reference</a> ·
  <a href="https://discord.gg/DzFxY58WXf">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/discord-component-embed?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/discord-component-embed) [![node](https://img.shields.io/node/v/discord-component-embed?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/discord-component-embed?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

When someone pastes a link to your site into Discord, Discord fetches the page and builds a preview card from its Open Graph tags. A [component embed](https://github.com/discord/discord-api-docs/pull/8606) swaps that card for a layout you build out of Discord's message components: markdown, images, a gallery, an accent color, and link buttons.

With this package you write that layout in JSX. It checks the tree against Discord's rules for the format, then writes the JSON Discord reads from your page.

Discord marks link previews as subject to change. Until v1.0.0, a minor version of this package can break too.

## Installation

```sh
pnpm add discord-component-embed
```

It needs React 19.2 or newer as a peer. Nothing in it imports from Node, so it runs on Node, Bun, Deno, and edge runtimes.

## Usage

Discord doesn't run JavaScript when it fetches your page, so the embed has to be in the HTML your server sends. Render [`<ComponentEmbed>`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/component-embed) there.

```tsx
import {
    ActionRow,
    ComponentEmbed,
    Container,
    LinkButton,
    MediaGallery,
    MediaGalleryItem,
    Section,
    Separator,
    TextDisplay
} from 'discord-component-embed';

export function GuidePreview({ page }: { page: GuidePage }) {
    return (
        <Container accentColor={0xf8f6e8}>
            <Section accessory={<LinkButton url={page.url} label="Read" />}>
                <TextDisplay>
                    # **[{page.title}]({page.url})**{'\n'}
                    {page.description}
                </TextDisplay>
            </Section>
            <MediaGallery>
                <MediaGalleryItem url={page.ogImage} description={page.title} />
            </MediaGallery>
            <Separator />
            <ActionRow>
                <LinkButton url="https://guide.seedcord.org" label="Guide" />
                <LinkButton url="https://docs.seedcord.org" label="Reference" />
                <LinkButton url="https://github.com/seedcord/seedcord" label="GitHub" />
            </ActionRow>
        </Container>
    );
}

// only Discord's crawler reads this. put it in the page, typically its <head>
<ComponentEmbed>
    <GuidePreview page={page} />
</ComponentEmbed>;
```

`GuidePreview` is a plain function component, and the `<Container>` it returns is the one root Discord allows. `0xf8f6e8` colors the bar down the card's left edge. At the bottom, `<ComponentEmbed>` turns the tree into the `<script>` tag Discord looks for.

JSX turns a line break in your source into a space. The `{'\n'}` after the title is what puts `page.description` on its own line in Discord.

Keep your Open Graph tags. Discord shows the standard card from them whenever it can't use the component embed.

### Linked JSON

If you'd rather keep the JSON out of the page, Discord can fetch it from its own URL on the same site. [`componentEmbedResponse`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/component-embed-response) builds the response for that URL.

```tsx
// app/embeds/[...slug]/route.tsx in Next.js
import { componentEmbedResponse } from 'discord-component-embed';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
    const page = await getGuidePage((await params).slug);
    return componentEmbedResponse(<GuidePreview page={page} />);
}
```

The route builds the same `GuidePreview` for whichever page `slug` points at. `componentEmbedResponse` checks the JSON against Discord's 3,000-byte limit for linked payloads, then returns a Web `Response` with an `application/json` content type.

Point the page at that URL with a `<link>` tag. The `href` has to be an absolute `https` URL on the page's host, a subdomain of it, or its parent domain.

```html
<link
    rel="discord:component-embed"
    type="application/json"
    href="https://guide.seedcord.org/embeds/components/custom-ids"
/>
```

If a page carries both tags, Discord uses the inline `<script>` and skips the `<link>`.

### Without React

The components are React components, but nothing here renders them. The package only reads the tree they form, so it works in any framework once `react` is installed as an ordinary dependency. Build the tree with React's `createElement`, and turn it into HTML with [`toComponentEmbedScript`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/to-component-embed-script). A SvelteKit page:

```ts
// src/routes/[...slug]/+page.server.ts
import { createElement as h } from 'react';
import { Container, TextDisplay, toComponentEmbedScript } from 'discord-component-embed';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const page = await getGuidePage(params.slug);
    const title = h(TextDisplay, null, `# ${page.title}`);
    const preview = h(Container, { accentColor: 0xf8f6e8 }, title);

    return { page, preview: toComponentEmbedScript(preview) };
};
```

```svelte
<!-- src/routes/[...slug]/+page.svelte -->
<script>
    let { data } = $props();
</script>

<svelte:head>
    {@html data.preview}
</svelte:head>
```

`h(Container, …)` builds the same element that `<Container>` does in JSX. `toComponentEmbedScript` returns the finished `<script>` tag as a string, with every `<` in the JSON escaped so text in your payload can't close the tag early. `{@html}` then writes that string into the head as it is.

Any framework with a way to put raw HTML in the `<head>` works the same way. For linked JSON, return `componentEmbedResponse` from any route that answers with a Web `Response`, like a SvelteKit `+server.ts`.

### Your own components

Split a big layout into plain function components, the way you would a page. They work anywhere in the tree, including as the root and as a `<Section>` accessory.

```tsx
function Headline({ title }: { title: string }) {
    return <TextDisplay># {title}</TextDisplay>;
}
```

The package calls `Headline` with its props while it reads the tree, outside React's renderer. A hook inside it throws a `ComponentEmbedError`, and so do `memo`, `lazy`, `forwardRef`, context, and class components. An async component throws too, so load your data first and pass it in as props.

### Custom emoji

A custom emoji in text uses Discord's markdown form, `<:name:id>`, or `<a:name:id>` for an animated one. On a button, it's an object.

```tsx
<TextDisplay>Built with {'<:seedcord:1538077321318236281>'} seedcord</TextDisplay>

<LinkButton url="https://seedcord.org" label="seedcord" emoji={{ name: 'seedcord', id: '1538077321318236281' }} />
```

The emoji in the `TextDisplay` sits inside `{'…'}` because JSX reads a bare `<` as the start of a tag. Written straight into the text, `<:seedcord:…>` won't compile. The button takes the same `id` and `name`, plus `animated: true` for a gif.

To find an emoji's id, send `\:seedcord:` in Discord. The message comes out in the markdown form, id included.

### Getting the JSON

[`toComponentEmbed`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/to-component-embed) returns the payload as an object. Use it to write the tag or the response yourself, or in a test that checks every page's preview before you deploy.

### Testing a preview

Discord caches a preview for about 30 minutes, so an edit won't show on a link you've already shared. Add a new query string, like `?v=2`, to see it right away. Changing only the `#fragment` doesn't help, since Discord leaves the fragment out of its cache key. Discord's [Embed Debugger](https://discord.com/developers/embeds) shows which tags it read from any URL.

The [reference](https://docs.seedcord.org/packages/discord-component-embed/latest) covers every export, with an example on each.

## Components

<!-- prettier-ignore-start -->

| Component | Goes in | Takes |
| --- | --- | --- |
| [`Container`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/container) | the root | `accentColor`, `spoiler`, and the components below |
| [`TextDisplay`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/text-display) | `Container`, `Section` | Discord markdown as text children |
| [`Section`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/section) | `Container` | 1 to 3 `TextDisplay` children and an `accessory` |
| [`Thumbnail`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/thumbnail) | a `Section` accessory | `url`, `description`, `spoiler` |
| [`LinkButton`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/link-button) | `ActionRow`, a `Section` accessory | `url`, `label`, `emoji`, `disabled` |
| [`MediaGallery`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/media-gallery) | `Container` | 1 to 10 `MediaGalleryItem` children |
| [`MediaGalleryItem`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/media-gallery-item) | `MediaGallery` | `url`, `description`, `spoiler` |
| [`Separator`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/separator) | `Container` | `divider`, `spacing` (`'small'` or `'large'`) |
| [`ActionRow`](https://docs.seedcord.org/packages/discord-component-embed/latest/functions/action-row) | `Container` | 1 to 5 `LinkButton` children |

<!-- prettier-ignore-end -->

## Errors

Discord doesn't report an invalid payload anywhere. It drops the payload and shows the Open Graph card. So `toComponentEmbed`, `toComponentEmbedScript`, `<ComponentEmbed>`, and `componentEmbedResponse` throw a [`ComponentEmbedError`](https://docs.seedcord.org/packages/discord-component-embed/latest/classes/component-embed-error) when:

- the root is anything other than one `Container`
- a component sits somewhere it isn't allowed, or text sits outside a `TextDisplay`
- a parent has too many or too few children, and a `Container` needs at least one
- a `TextDisplay` is empty or holds anything besides text
- a prop has the wrong type, like the string `'yes'` where Discord needs a boolean, or a `spacing` other than `'small'` or `'large'`
- one of your components throws, uses a hook, or is anything but a plain function
- `accentColor` is outside `0` to `0xFFFFFF`
- a `LinkButton` has neither a `label` nor an `emoji`, has a label over 80 characters, or has a `url` that is over 512 characters or not `http`, `https`, or `discord`
- a media `url` is over 2048 characters or not `http` or `https`, or its `description` is over 1024 characters
- any `url` has whitespace in it
- the embed has more than 40 components, counting the container
- linked JSON is larger than 3000 bytes

Every `ComponentEmbedError` carries a `code` to branch on: `InvalidStructure`, `InvalidProp`, `OverLimit`, `UnsupportedComponent`, or `ReadFailed`. The messages can change between releases. The codes stay. If a component or an iterator of yours throws while the tree is read, you get a `ReadFailed` with the original error on `cause`.

Discord also has to fetch the page and every image within 10 seconds, without a login or a bot challenge. This package can't check that for you. If your site sits behind bot protection, allow user agents containing `Discordbot`.
