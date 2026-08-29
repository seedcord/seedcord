/**
 * Copies only the keys holding a value, dropping both `undefined` and `null`.
 *
 * @typeParam TObject - the original object type you're pulling from
 * @typeParam TKey - the keys to copy when defined
 * @param source - the object to read values from
 * @param keys - optional list of keys to include when present. {@default all keys}
 *
 * @example
 * ```ts
 * interface Config {
 *   host?: string;
 *   port?: number;
 *   user?: string;
 *   password?: string | null;
 * }
 *
 * const config: Config = {
 *   host: 'localhost',
 *   port: undefined,
 *   user: 'admin',
 *   password: null
 * };
 *
 * const definedConfig = keepDefined(config, 'host', 'port', 'user', 'password');
 * // Result: { host: 'localhost', user: 'admin' }
 * ```
 */
export function keepDefined<TObject extends object, TKey extends keyof TObject>(
    source: TObject,
    ...keys: readonly TKey[]
): Partial<Pick<TObject, TKey extends never ? keyof TObject : TKey>> {
    const selectedKeys = keys.length > 0 ? keys : (Object.keys(source) as TKey[]);
    const result: Partial<TObject> = {};

    for (const key of selectedKeys) {
        const value = source[key];
        if (value !== undefined && value !== null) {
            result[key] = value;
        }
    }
    return result;
}
