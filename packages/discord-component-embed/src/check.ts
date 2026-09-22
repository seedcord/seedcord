import { messageOf } from './checks';
import { collectPayloadErrors, fromPayload } from './fromPayload';
import { embedStats, MAX_JSON_BYTES } from './limits';
import { SCRIPT_ID } from './scriptId';
import { toComponentEmbed } from './toComponentEmbed';

import type { ComponentEmbedPayload } from './toComponentEmbed';

export interface CheckInput {
    readFile(path: string): Promise<string>;
    fetch(url: string, init: RequestInit): Promise<Response>;
}

export type CheckResult =
    | { status: 'pass'; bytes: number; components: number; galleryItems: number }
    | { status: 'fail'; problems: string[]; hint?: string }
    | { status: 'unreadable'; reason: string };

// discord's crawler sends this. a site can serve bots different HTML
const DISCORDBOT = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';

type Loaded = { text: string } | CheckResult;

export async function checkTarget(target: string, input: CheckInput): Promise<CheckResult> {
    const loaded = await load(target, input);
    return 'text' in loaded ? checkJsonText(loaded.text) : loaded;
}

async function load(target: string, input: CheckInput): Promise<Loaded> {
    if (/^https?:\/\//.test(target)) {
        const pageUrl = new URL(target);
        const page = await fetchText(pageUrl, input);
        return 'text' in page ? embedIn(page.text, pageUrl.hostname, input) : page;
    }

    const file = await loadFile(target, input);
    if (!('text' in file) || !/\.html?$/i.test(target)) return file;
    return embedIn(file.text, undefined, input);
}

async function loadFile(path: string, input: CheckInput): Promise<Loaded> {
    try {
        return { text: await input.readFile(path) };
    } catch (error) {
        return { status: 'unreadable', reason: `Couldn't read ${path}: ${oneLine(messageOf(error))}` };
    }
}

// an undefined pageHost means a local html file
async function embedIn(html: string, pageHost: string | undefined, input: CheckInput): Promise<Loaded> {
    const script = findTags(html, 'script').find((tag) => tag.attributes.get('id') === SCRIPT_ID);
    if (script) return { text: script.body };

    const link = findTags(html, 'link').find((tag) => tag.attributes.get('rel')?.split(/\s+/).includes(SCRIPT_ID));
    if (!link) {
        return {
            status: 'fail',
            problems: [
                `The page has no component embed. Discord reads a <script id="${SCRIPT_ID}"> or a <link rel="${SCRIPT_ID}">.`
            ]
        };
    }

    const href = link.attributes.get('href') ?? '';
    const jsonUrl = URL.parse(href);
    const offSite = pageHost !== undefined && jsonUrl !== null && !sameSite(jsonUrl.hostname, pageHost);
    if (jsonUrl?.protocol !== 'https:' || offSite) {
        const where = pageHost === undefined ? '' : " on the page's host, a subdomain of it, or its parent domain";
        return { status: 'fail', problems: [`The <link> href has to be an absolute https URL${where}, got ${href}.`] };
    }

    return fetchText(jsonUrl, input);
}

async function fetchText(url: URL, input: CheckInput): Promise<Loaded> {
    try {
        const response = await input.fetch(url.href, { headers: { 'user-agent': DISCORDBOT } });
        if (!response.ok) {
            return {
                status: 'unreadable',
                reason: `Couldn't fetch ${url.href}: the server answered ${String(response.status)}.`
            };
        }
        return { text: await response.text() };
    } catch (error) {
        return {
            status: 'unreadable',
            reason: `Couldn't fetch ${url.href}: ${oneLine(messageOf(networkError(error)))}`
        };
    }
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

// HTML doesn't decode character references inside a script
function findTags(html: string, name: 'script' | 'link'): Tag[] {
    const pattern = name === 'script' ? /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi : /<link\b([^>]*?)\/?>/gi;
    return [...html.matchAll(pattern)].map(([, attributes = '', body = '']) => ({
        attributes: parseAttributes(attributes),
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
        if (typeof hex === 'string') return String.fromCodePoint(Number.parseInt(hex, 16));
        if (typeof decimal === 'string') return String.fromCodePoint(Number.parseInt(decimal, 10));
        return NAMED_REFERENCES[String(named).toLowerCase()] ?? reference;
    });
}

// text is the JSON exactly as discord would read it
function checkJsonText(text: string): CheckResult {
    let payload: unknown;
    try {
        payload = JSON.parse(text);
    } catch (error) {
        return { status: 'fail', problems: [`The JSON doesn't parse: ${oneLine(messageOf(error))}.`] };
    }

    const errors = collectPayloadErrors(payload, text);
    const bytes = byteLength(text);
    if (errors.length > 0) {
        const minified = byteLength(JSON.stringify(payload));
        return {
            status: 'fail',
            problems: errors.map((error) => error.message),
            ...(bytes > MAX_JSON_BYTES &&
                minified < bytes && { hint: `Minified, the JSON is ${String(minified)} bytes.` })
        };
    }

    // can't throw here. collectPayloadErrors just checked this payload
    const { component } = toComponentEmbed(fromPayload(payload as ComponentEmbedPayload));
    return { status: 'pass', bytes, ...embedStats(component) };
}

function byteLength(text: string): number {
    return new TextEncoder().encode(text).byteLength;
}
