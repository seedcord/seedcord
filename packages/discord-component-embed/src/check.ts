import { describeValue, messageOf } from './checks';
import { collectPayloadErrors } from './fromPayload';
import { embedStats, MAX_JSON_BYTES } from './limits';
import { SCRIPT_ID } from './scriptId';
import { scriptSafeJson } from './scriptSafeJson';

import type { ComponentEmbedPayload } from './toComponentEmbed';

export interface CheckInput {
    readFile(path: string): Promise<string>;
    fetch(url: string, init: RequestInit): Promise<Response>;
    nowMs(): number;
}

export type CheckResult =
    | { status: 'pass'; bytes: number; components: number; galleryItems: number; warnings?: string[] }
    | { status: 'fail'; problems: string[]; hint?: string; warnings?: string[] }
    | { status: 'unreadable'; reason: string };

type Checked = Extract<CheckResult, { status: 'pass' | 'fail' }>;

// the user agents from the component embed docs
const PAGE_USER_AGENT = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';
const JSON_USER_AGENT = 'Discordbot/2.0';

// discord's crawler gave up about 10 s after it asked for the page, linked JSON included. behind a tunnel, the
// server saw 9.8 to 9.9 s of that
const DISCORD_TIMEOUT_MS = 10_000;
const SLOW_WARNING_MS = DISCORD_TIMEOUT_MS - 1000;
const DISCORD_WAITS =
    'Discord waits about 10 seconds in total for the page and its linked JSON, then shows no preview.';

type Loaded = { text: string; inScript: boolean } | CheckResult;
type Unreadable = Extract<CheckResult, { status: 'unreadable' }>;
type Fetched = { text: string; contentType: string } | Unreadable;

// a local html file has no host to hold a <link> to
type LinkRule = { pageHost: string } | 'file';

export async function checkTarget(target: string, input: CheckInput): Promise<CheckResult> {
    const start = input.nowMs();
    const loaded = await load(target, start + DISCORD_TIMEOUT_MS, input);
    if (!('text' in loaded)) return loaded;
    const result = checkJsonText(loaded.text, loaded.inScript ? scriptSafeJson : JSON.stringify);
    const tookMs = input.nowMs() - start;
    return tookMs >= SLOW_WARNING_MS ? { ...result, warnings: [slowWarning(tookMs)] } : result;
}

async function load(target: string, deadline: number, input: CheckInput): Promise<Loaded> {
    if (/^https?:\/\//i.test(target)) {
        const url = URL.parse(target);
        if (!url) return { status: 'unreadable', reason: `${target} isn't a valid URL.` };
        const page = await fetchText(url, PAGE_USER_AGENT, deadline, input);
        if (!('text' in page)) return page;
        if (isJson(page.contentType)) return { text: page.text, inScript: false };
        // discord's crawler held the <link> to the pasted URL's host, even after a redirect to another host
        return embedIn(page.text, { pageHost: url.hostname }, deadline, input);
    }

    const file = await loadFile(target, input);
    if (!('text' in file) || !/\.html?$/i.test(target)) return file;
    return embedIn(file.text, 'file', deadline, input);
}

async function loadFile(path: string, input: CheckInput): Promise<Loaded> {
    try {
        return { text: await input.readFile(path), inScript: false };
    } catch (error) {
        return { status: 'unreadable', reason: `Couldn't read ${path}: ${oneLine(messageOf(error))}` };
    }
}

async function embedIn(html: string, rule: LinkRule, deadline: number, input: CheckInput): Promise<Loaded> {
    const script = findTags(html, 'script').find((tag) => tag.attributes.get('id') === SCRIPT_ID);
    if (script) {
        const wrongType = typeProblem(script, `<script id="${SCRIPT_ID}">`);
        return wrongType ?? { text: script.body, inScript: true };
    }

    const link = findTags(html, 'link').find((tag) => tag.attributes.get('rel')?.split(/\s+/).includes(SCRIPT_ID));
    if (!link) {
        return {
            status: 'fail',
            problems: [
                `The page has no component embed. Discord reads a <script id="${SCRIPT_ID}"> or a <link rel="${SCRIPT_ID}">.`
            ]
        };
    }
    const wrongType = typeProblem(link, `<link rel="${SCRIPT_ID}">`);
    if (wrongType) return wrongType;

    const href = link.attributes.get('href');
    const jsonUrl = URL.parse(href ?? '');
    const offSite = rule !== 'file' && jsonUrl !== null && !sameSite(jsonUrl.hostname, rule.pageHost);
    if (jsonUrl?.protocol !== 'https:' || offSite) {
        const where = rule === 'file' ? '' : " on the page's host, a subdomain of it, or a domain above it";
        return {
            status: 'fail',
            problems: [`The <link> href has to be an absolute https URL${where}, got ${href ?? 'nothing'}.`]
        };
    }

    // discord shows the Open Graph card for a linked JSON that answers 404
    const json = await fetchText(jsonUrl, JSON_USER_AGENT, deadline, input);
    if ('text' in json) return { text: json.text, inScript: false };
    return { status: 'fail', problems: [json.reason] };
}

// the docs require this exact type. discord's crawler ignored a <link> without it
function typeProblem(tag: Tag, label: string): CheckResult | undefined {
    const type = tag.attributes.get('type');
    if (type === 'application/json') return undefined;
    return {
        status: 'fail',
        problems: [`The ${label} has to have type="application/json", got ${describeValue(type)}.`]
    };
}

function isJson(contentType: string): boolean {
    return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json';
}

async function fetchText(url: URL, userAgent: string, deadline: number, input: CheckInput): Promise<Fetched> {
    const remainingMs = deadline - input.nowMs();
    if (remainingMs <= 0) return couldNotFetch(url, timedOut());
    try {
        const response = await input.fetch(url.href, {
            headers: { 'user-agent': userAgent },
            // node rejects a timeout that isn't a whole number of ms
            signal: AbortSignal.timeout(Math.ceil(remainingMs))
        });
        if (!response.ok) return couldNotFetch(url, `the server answered ${String(response.status)}.`);
        const text = await response.text();
        return { text, contentType: response.headers.get('content-type') ?? '' };
    } catch (error) {
        const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
        return couldNotFetch(url, isTimeout ? timedOut() : oneLine(messageOf(networkError(error))));
    }
}

function couldNotFetch(url: URL, why: string): Unreadable {
    return { status: 'unreadable', reason: `Couldn't fetch ${url.href}: ${why}` };
}

function timedOut(): string {
    return `no answer before the 10 seconds ran out. ${DISCORD_WAITS}`;
}

function slowWarning(ms: number): string {
    return `Fetching this embed took ${(ms / 1000).toFixed(1)} seconds. ${DISCORD_WAITS}`;
}

// V8's parse errors and openssl's messages can hold newlines
function oneLine(message: string): string {
    return message.replaceAll(/\s+/g, ' ').trim();
}

// node's fetch throws "fetch failed" and keeps the network error on cause
function networkError(thrown: unknown): unknown {
    return Error.isError(thrown) && Error.isError(thrown.cause) ? thrown.cause : thrown;
}

// the component embed docs allow the page's host, a subdomain of it, or its parent domain
function sameSite(jsonHost: string, pageHost: string): boolean {
    return jsonHost === pageHost || jsonHost.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${jsonHost}`);
}

interface Tag {
    attributes: ReadonlyMap<string, string>;
    body: string;
}

// quoted values can hold a >
const ATTRIBUTES = '((?:"[^"]*"|\'[^\']*\'|[^\'">])*?)';
const SCRIPT_TAG = new RegExp(String.raw`<script\b${ATTRIBUTES}>([\s\S]*?)<\/script\s*>`, 'gi');
const LINK_TAG = new RegExp(String.raw`<link\b${ATTRIBUTES}\/?>`, 'gi');
// a script's text can hold <!-- and --> without being a comment
const COMMENT_OR_SCRIPT = new RegExp(String.raw`<!--[\s\S]*?-->|${SCRIPT_TAG.source}`, 'gi');

function findTags(html: string, name: 'script' | 'link'): Tag[] {
    // a <link> written inside a script is text in that script
    const keep = (match: string): boolean => name === 'script' && !match.startsWith('<!--');
    const visible = html.replaceAll(COMMENT_OR_SCRIPT, (match) => (keep(match) ? match : ''));
    return [...visible.matchAll(name === 'script' ? SCRIPT_TAG : LINK_TAG)].map(([, attributes = '', body = '']) => ({
        attributes: parseAttributes(attributes),
        // HTML doesn't decode character references inside a script
        body
    }));
}

function parseAttributes(source: string): ReadonlyMap<string, string> {
    const attributes = new Map<string, string>();
    for (const [, name = '', doubled, single, bare] of source.matchAll(
        /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    )) {
        attributes.set(name.toLowerCase(), decodeReferences(doubled ?? single ?? bare ?? ''));
    }
    return attributes;
}

const NAMED_REFERENCES: Readonly<Record<string, string>> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

function decodeReferences(value: string): string {
    return value.replaceAll(/&(?:#x([\da-f]+)|#(\d+)|(amp|quot|apos|lt|gt));/gi, (reference, hex, decimal, named) => {
        if (typeof hex === 'string') return character(Number.parseInt(hex, 16));
        if (typeof decimal === 'string') return character(Number.parseInt(decimal, 10));
        return NAMED_REFERENCES[String(named).toLowerCase()] ?? reference;
    });
}

const LAST_CODE_POINT = 0x10_ff_ff;
// browsers decode a reference past the last code point to this one
const REPLACEMENT_CHARACTER = 0xff_fd;

function character(codePoint: number): string {
    return String.fromCodePoint(codePoint > LAST_CODE_POINT ? REPLACEMENT_CHARACTER : codePoint);
}

function checkJsonText(sentJson: string, minify: (payload: unknown) => string): Checked {
    let payload: unknown;
    try {
        payload = JSON.parse(sentJson);
    } catch (error) {
        return { status: 'fail', problems: [`The JSON doesn't parse: ${oneLine(messageOf(error))}.`] };
    }

    const errors = collectPayloadErrors(payload, sentJson);
    const bytes = byteLength(sentJson);
    if (errors.length > 0) {
        const minified = byteLength(minify(payload));
        return {
            status: 'fail',
            problems: errors.map((error) => error.message),
            ...(bytes > MAX_JSON_BYTES &&
                minified <= MAX_JSON_BYTES && { hint: `Minified, the JSON is ${String(minified)} bytes.` })
        };
    }

    // collectPayloadErrors found nothing wrong with its shape
    const { component } = payload as ComponentEmbedPayload;
    return { status: 'pass', bytes, ...embedStats(component) };
}

function byteLength(text: string): number {
    return new TextEncoder().encode(text).byteLength;
}
