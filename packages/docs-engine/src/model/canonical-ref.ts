import type { DocReference } from '../types';

/**
 * API Extractor's `canonicalReference` (a TSDoc `DeclarationReference`) is an experimental/beta API.
 * All parsing of it lives in this one file so an AE upgrade only breaks this file. We rely only
 * on its stable string form, e.g.:
 *   `seedcord!Logger:class`            top-level export
 *   `seedcord!Logger#debug:member(1)`  instance member
 *   `seedcord!Logger.configure:member(1)` static member
 *   `seedcord!~RowTypes:var`           forgotten/local (not exported)
 *   `!Partial:type`                    TS lib / global (no package)
 * The leading segment before `!` is the package; a leading `~` on the symbol path marks a
 * not-exported declaration; the trailing `:meaning(N)` is the symbol meaning + overload index.
 */
export interface CanonicalReferenceLike {
    toString(): string;
}

/** The engine's node identity: the canonical-reference string. */
export type CanonicalKey = string;

export function canonicalKey(ref: CanonicalReferenceLike): CanonicalKey {
    return ref.toString();
}

/** Package that owns the referenced symbol, or undefined for TS-lib / global (`!Foo`). */
export function packageNameOf(ref: CanonicalReferenceLike): string | undefined {
    const key = ref.toString();
    const bang = key.indexOf('!');
    if (bang > 0) return key.slice(0, bang);
    // API Extractor encodes an external ambient-module import as a quoted module source after a
    // leading `!`, e.g. `!"\"node:stream\"".Stream.Writable:class` or `!"\"mongoose\"".Schema:class`.
    // A bare `!Foo` (no quotes) is a TS lib / global, which has no owning package.
    const ambient = /^!"\\"([^\\]+)\\""/.exec(key);
    return ambient?.[1];
}

/** Dotted/hashed symbol path with the `~`-not-exported marker stripped, e.g. `Logger.configure`. */
export function qualifiedNameOf(ref: CanonicalReferenceLike): string | undefined {
    const key = ref.toString();
    const bang = key.indexOf('!');
    const afterPackage = bang >= 0 ? key.slice(bang + 1) : key;
    const meaning = afterPackage.lastIndexOf(':');
    const symbolPath = (meaning >= 0 ? afterPackage.slice(0, meaning) : afterPackage).replace(/~/g, '');
    return symbolPath.length > 0 ? symbolPath : undefined;
}

/**
 * Build a `DocReference` for a referenced symbol. `displayText` is the rendered token label (already
 * the name as it appears in source, e.g. `Partial`), so we keep it as `name` and derive the lookup
 * key + package from the canonical reference.
 */
export function referenceFromCanonical(ref: CanonicalReferenceLike, displayText: string): DocReference {
    const reference: DocReference = { name: displayText, targetKey: canonicalKey(ref) };
    const pkg = packageNameOf(ref);
    if (pkg) reference.packageName = pkg;
    const qualified = qualifiedNameOf(ref);
    if (qualified) reference.qualifiedName = qualified;
    return reference;
}
