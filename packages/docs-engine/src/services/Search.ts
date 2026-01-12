import uFuzzy from '@leeoniya/ufuzzy';
import { ReflectionKind } from 'typedoc';

import type { DocCollection, DocSearchEntry } from '../types';

const SCORE_FUZZY_MATCH = 5;
const SCORE_NAME_EXACT = 8;
const SCORE_QNAME_EXACT = 10;
const SCORE_TOKEN_MATCH = 4;
const SCORE_TOKEN_PREFIX = 2;
const SCORE_ALIAS_EXACT = 9;
const SCORE_FILE_EXACT = 5;
const SCORE_PACKAGE_MATCH = 3;
const SCORE_SLUG_EXACT = 7;
const SCORE_SLUG_PREFIX = 3;
const KIND_SCORE_DEFAULT = 4;
const KIND_SCORE_TABLE: Partial<Record<ReflectionKind, number>> = {
    [ReflectionKind.Class]: 18,
    [ReflectionKind.Interface]: 16,
    [ReflectionKind.TypeAlias]: 15,
    [ReflectionKind.Enum]: 14,
    [ReflectionKind.Function]: 13,
    [ReflectionKind.Constructor]: 12,
    [ReflectionKind.Method]: 11,
    [ReflectionKind.Accessor]: 10,
    [ReflectionKind.Property]: 9,
    [ReflectionKind.EnumMember]: 7,
    [ReflectionKind.Variable]: 7,
    [ReflectionKind.TypeParameter]: 6,
    [ReflectionKind.Project]: 1,
    [ReflectionKind.Module]: 6,
    [ReflectionKind.Namespace]: 6,
    [ReflectionKind.CallSignature]: 10,
    [ReflectionKind.ConstructorSignature]: 10,
    [ReflectionKind.IndexSignature]: 8,
    [ReflectionKind.GetSignature]: 10,
    [ReflectionKind.SetSignature]: 10
};

export class DocSearch {
    private readonly searchIndex: DocSearchEntry[];
    private readonly uf: uFuzzy;
    private readonly namesHaystack: string[];
    private readonly qualifiedNamesHaystack: string[];

    private readonly collator = new Intl.Collator(undefined, { sensitivity: 'accent', usage: 'search' });

    private readonly safeEquals = (value: string | undefined, token: string): boolean =>
        typeof value === 'string' && value.length > 0 && this.collator.compare(value.toLowerCase(), token) === 0;

    private readonly getKindWeight = (kind: ReflectionKind): number => KIND_SCORE_TABLE[kind] ?? KIND_SCORE_DEFAULT;

    private readonly aggregateSearchIndex = (collection: DocCollection): DocSearchEntry[] =>
        collection.packages.flatMap((pkg) => pkg.indexes.search);

    private readonly tokenizeQuery = (query: string): string[] =>
        query
            .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
            .split(/[^a-zA-Z0-9]+/gu)
            .filter(Boolean)
            .map((token) => token.toLowerCase());

    constructor(private readonly collection: DocCollection) {
        this.searchIndex = this.aggregateSearchIndex(collection);

        this.uf = new uFuzzy({ intraMode: 1 });
        this.namesHaystack = this.searchIndex.map((e) => e.name.toLowerCase());
        this.qualifiedNamesHaystack = this.searchIndex.map((e) => e.qualifiedName.toLowerCase());
    }

    search(query: string, pkgName?: string): DocSearchEntry[] {
        const tokens = this.tokenizeQuery(query);
        if (tokens.length === 0) {
            return [];
        }

        const source = pkgName
            ? (this.collection.packages.find((pkg) => pkg.manifest.name === pkgName)?.indexes.search ?? [])
            : this.searchIndex;

        const [nameIdxs] = this.uf.search(this.namesHaystack, query.toLowerCase());
        const [qNameIdxs] = this.uf.search(this.qualifiedNamesHaystack, query.toLowerCase());

        const fuzzyMatches = new Set<DocSearchEntry>();
        if (nameIdxs) {
            for (const idx of nameIdxs) {
                const entry = this.searchIndex[idx];
                if (entry) fuzzyMatches.add(entry);
            }
        }
        if (qNameIdxs) {
            for (const idx of qNameIdxs) {
                const entry = this.searchIndex[idx];
                if (entry) fuzzyMatches.add(entry);
            }
        }

        return source
            .map((entry) => ({ entry, value: this.score(entry, tokens, fuzzyMatches) }))
            .filter(({ value }) => value > 0)
            .sort((a, b) => b.value - a.value)
            .map(({ entry }) => entry);
    }

    private score(entry: DocSearchEntry, tokens: string[], fuzzyMatches: Set<DocSearchEntry>): number {
        let value = 0;
        const slugTokens = this.tokenizeSlug(entry.slug);

        if (fuzzyMatches.has(entry)) {
            value += SCORE_FUZZY_MATCH;
        }

        for (const token of tokens) {
            value += this.scoreToken(entry, token, slugTokens);
        }

        if (value > 0) {
            value += this.getKindWeight(entry.kind);
        }

        return value;
    }

    private tokenizeSlug(slug: string): Set<string> {
        if (!slug) {
            return new Set();
        }

        const parts = slug
            .split(/[^a-zA-Z0-9]+/gu)
            .filter(Boolean)
            .map((part) => part.toLowerCase());

        return new Set(parts);
    }

    private hasSlugPrefix(tokens: Set<string>, candidate: string): boolean {
        for (const token of tokens) {
            if (token.startsWith(candidate)) {
                return true;
            }
        }

        return false;
    }

    private scoreToken(entry: DocSearchEntry, token: string, slugTokens: Set<string>): number {
        let value = 0;

        if (this.safeEquals(entry.name, token)) {
            value += SCORE_NAME_EXACT;
        }

        if (this.safeEquals(entry.qualifiedName, token)) {
            value += SCORE_QNAME_EXACT;
        }

        if (entry.tokens.includes(token)) {
            value += SCORE_TOKEN_MATCH;
        }

        if (entry.tokens.some((candidate) => candidate.startsWith(token))) {
            value += SCORE_TOKEN_PREFIX;
        }

        if (entry.aliases?.some((alias) => this.safeEquals(alias, token))) {
            value += SCORE_ALIAS_EXACT;
        }

        if (entry.file && this.safeEquals(entry.file, token)) {
            value += SCORE_FILE_EXACT;
        }

        if (this.safeEquals(entry.packageName, token) || this.safeEquals(entry.packageVersion, token)) {
            value += SCORE_PACKAGE_MATCH;
        }

        if (slugTokens.has(token)) {
            value += SCORE_SLUG_EXACT;
        } else if (this.hasSlugPrefix(slugTokens, token)) {
            value += SCORE_SLUG_PREFIX;
        }

        return value;
    }
}
