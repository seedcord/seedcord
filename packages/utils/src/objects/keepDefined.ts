/**
 * Pulls out only the keys from an object that actually have values.
 *
 * @typeParam TObject - the original object type you're pulling from
 * @typeParam TKey - the specific keys you want to copy if they're defined
 * @param source - the object to read values from
 * @param keys - optional list of keys you want to include if they exist. If omitted, all keys are considered
 *
 * @example
 * ```ts
 * interface Config {
 *   host?: string;
 *   port?: number;
 *   user?: string;
 *   password?: string;
 * }
 *
 * const config: Config = {
 *   host: 'localhost',
 *   port: undefined,
 *   user: 'admin',
 *   password: undefined
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
