# Home page

`apps/home` is the front door. Read `apps/AGENTS.md` before touching it.

## Order

1. Inventory the page: list the sections in `src/app/page.tsx` order, with their background colors, and say what the release adds that the page never mentions.
2. Propose the changes as a table, one row per section, then ask the decisions through `AskUserQuestion`: new sections and where they sit, what the hero gains, what leaves.
3. Start the dev server in the worktree on a free port, in the background with the sandbox off. Leave it running.
4. Build the new sections first. Load the `frontend-iteration` skill. The page itself is the preview, so check each section in Chrome through chrome-devtools-mcp at 1440px and at 390px, and confirm nothing scrolls sideways.
5. Show the maintainer, fix what they flag, then do the smaller edits: the hero line, the marquee, the feature grid, the section cards, and the meta description.
6. Test the link preview card in Discord. See below.
7. Review your own diff twice, then run `tc`, `eslint --max-warnings=0`, and `pnpm react-doctor --verbose`.

Done when the maintainer has seen every section at both widths, the card renders in Discord, and the gates are clean.

## Code

- Read `tooling/ui/src` and the home app's own `components/ui` before writing any element. Home has its own poster style, with `rule` and `blk` borders, so its local primitives come first.
- When the same markup shows up a second time, lift it into a home component in the same change. Chips were the case on the Vite release, copied between two sections.
- A list of cards is data plus one component. A card that differs takes an extra field, like a `sample`, and needs no second copy of the card.
- A section alternates its background with its neighbours. Read the grounds of the sections around it.
- Links go through `SiteLink`, and URLs live in `lib/site.ts`.
- A bare `'` in JSX text fails lint, and nothing on the site escapes one. Reword the sentence.

## The Discord card

The home page renders a `discord-component-embed` card that Discord shows when someone posts the link.

1. Open a quick tunnel to the dev server: `cloudflared tunnel --no-autoupdate --url http://localhost:<port>`, in the background with the sandbox off.
2. Read the URL out of the task's output with `grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com'`.
3. Wait a few seconds for DNS, then curl it as Discordbot through `--doh-url https://1.1.1.1/dns-query`. Check that the status is 200 and that the page carries `discord:component-embed`.
4. Give the maintainer the link with `?v=1`. They paste it in their test server. Discord caches a preview for about 30 minutes, so a re-test needs `?v=2`.
5. Stop the tunnel with TaskStop when done.

## envapt and other projects

The home page can mention the maintainer's other libraries where seedcord really uses them, like envapt in the feature grid and in the `.env` sentence of the Vite section.
