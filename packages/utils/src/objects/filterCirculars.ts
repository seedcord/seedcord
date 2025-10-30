import type { ILogger } from '@seedcord/types';
import type { JsonPrimitive } from 'type-fest';

/**
 * JSONify an arbitrary type while allowing any object position to be replaced
 * by a circular marker. Optional keys stay optional.
 */
export type JsonifyWithCirculars<BaseType, Marker extends string = '[Circular]'> = BaseType extends JsonPrimitive
    ? BaseType
    : BaseType extends bigint
      ? string
      : BaseType extends Date
        ? string
        : BaseType extends { toJSON(): infer J }
          ? unknown extends J
              ? JsonifyObject<BaseType, Marker>
              : JsonifyWithCirculars<J, Marker>
          : BaseType extends readonly (infer U)[]
            ? (JsonifyWithCirculars<U, Marker> | Marker)[]
            : BaseType extends Map<infer K, infer V>
              ? [JsonifyWithCirculars<K, Marker> | Marker, JsonifyWithCirculars<V, Marker> | Marker][]
              : BaseType extends Set<infer U2>
                ? (JsonifyWithCirculars<U2, Marker> | Marker)[]
                : BaseType extends (...args: unknown[]) => unknown
                  ? never
                  : BaseType extends object
                    ? JsonifyObject<BaseType, Marker>
                    : never;

/**
 * Helper to JSONify object types with circular markers.
 *
 * @internal
 */
export type JsonifyObject<BaseType, Marker extends string> = {
    [K in keyof BaseType as K extends symbol
        ? never
        : BaseType[K] extends (...args: unknown[]) => unknown
          ? never
          : K]:
        | JsonifyWithCirculars<Exclude<BaseType[K], undefined>, Marker>
        | Extract<BaseType[K], undefined>
        | Marker;
};

/**
 * Configuration for {@link filterCirculars}.
 */
export interface FilterCircularsOptions<Marker extends string = '[Circular]'> {
    /** Optional {@link ILogger} used to log stringify or parse errors. */
    logger?: ILogger;
    /** Override the circular placeholder. Default is `[Circular]`. */
    marker?: Marker;
    /** Processing mode. `json` uses stringify and parse (might end up using a `toJSON()` if found). `decycle` builds a safe clone first. Default is `decycle`. */
    mode?: 'json' | 'decycle';
}

/**
 * Creates a clean, JSON safe copy of a value and replaces circular references with a marker.
 *
 * In `json` mode it behaves like stringify then parse with a replacer that handles cycles and BigInt.
 * In `decycle` mode it first clones without using toJSON, then you can stringify the result later.
 *
 * @typeParam ObjType - Type of the input value.
 * @typeParam Marker - Marker string used for circular references.
 *
 * @param value - The value to clone safely.
 * @param options - Optional configuration.
 *
 * @returns A JSON safe structure with circular references replaced by the marker.
 *
 * @example
 * ```ts
 * interface Test {
 *   name: string;
 *   self?: Test;
 * }
 *
 * const obj: Test = { name: 'seedcord' };
 * obj.self = obj;
 *
 * const clean = filterCirculars(obj);
 * //     ^? { name: string; self?: "[Circular]" | { ... } }
 * console.log(clean.self); // "[Circular]"
 * ```
 */
export function filterCirculars<ObjType, Marker extends string = '[Circular]'>(
    value: ObjType,
    options?: FilterCircularsOptions<Marker>
): JsonifyWithCirculars<ObjType, Marker> {
    const logger = options?.logger;
    const marker = (options?.marker ?? '[Circular]') as Marker;
    const mode = options?.mode ?? 'decycle';

    if (mode === 'json') return json(value, marker, logger);

    try {
        return decycle(value, marker);
    } catch (error) {
        logger?.error('filterCirculars decycle error', error);
        return value as JsonifyWithCirculars<ObjType, Marker>;
    }
}

/**
 * Attempts to build a JSONified object using JSON.stringify and JSON.parse.
 *
 * @internal
 */
function json<ObjType, Marker extends string>(
    value: ObjType,
    marker: Marker,
    logger?: ILogger
): JsonifyWithCirculars<ObjType, Marker> {
    const seen = new WeakSet<object>();
    let json: string | undefined;

    try {
        json = JSON.stringify(value, (_k: string, v: unknown) => {
            if (typeof v === 'bigint') return v.toString();
            if (typeof v === 'object' && v !== null) {
                const obj = v;
                if (seen.has(obj)) return marker;
                seen.add(obj);
            }
            return v;
        });
    } catch (error) {
        logger?.error('filterCirculars stringify error', error);
        if (typeof value === 'object' && value !== null) {
            logger?.error('top level keys', Object.keys(value as Record<string, unknown>));
        }
        return value as JsonifyWithCirculars<ObjType, Marker>;
    }

    if (typeof json !== 'string') {
        return value as JsonifyWithCirculars<ObjType, Marker>;
    }

    try {
        return JSON.parse(json) as JsonifyWithCirculars<ObjType, Marker>;
    } catch (error) {
        logger?.error('filterCirculars parse error', error);
        logger?.error('bad JSON', json);
        return value as JsonifyWithCirculars<ObjType, Marker>;
    }
}

/**
 * Builds a JSON safe clone without calling toJSON on class instances.
 *
 * @internal
 */
function decycle<ObjType, Marker extends string = '[Circular]'>(
    input: ObjType,
    marker: Marker,
    seen = new WeakSet<object>()
): JsonifyWithCirculars<ObjType, Marker> {
    const recur = (val: unknown): unknown => {
        if (val === null) return null;
        const t = typeof val;

        // if bigint, return string representation
        if (t === 'bigint') return (val as bigint).toString();

        // if primitive, return as is
        if (t !== 'object') return val;

        const obj = val as Record<string | number | symbol, unknown>;

        if (seen.has(obj)) return marker;
        seen.add(obj);

        // if Date, return ISO string
        if (obj instanceof Date) return obj.toISOString();

        // if RegExp, return string representation
        if (obj instanceof RegExp) return obj.toString();

        // if array, recur on each item
        if (Array.isArray(obj)) {
            return obj.map((item) => recur(item));
        }

        // if Map, recur on entries/values
        if (obj instanceof Map) {
            return Array.from(obj, ([k, v]) => [recur(k), recur(v)]);
        }

        // if Set, recur on values
        if (obj instanceof Set) {
            return Array.from(obj, (v) => recur(v));
        }

        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'function') continue;
            out[k] = recur(v);
        }

        return out;
    };

    return recur(input) as JsonifyWithCirculars<ObjType, Marker>;
}
