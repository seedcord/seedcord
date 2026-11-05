// a failed load runs again on the next call
export function loadOnce<Args extends unknown[], Loaded>(
    load: (...args: Args) => Promise<Loaded>
): (...args: Args) => Promise<Loaded> {
    // cloudflare cancels a load when the client that started it disconnects. requests waiting on that load would hang
    let loaded: { value: Loaded } | undefined;
    return async (...args) => {
        loaded ??= { value: await load(...args) };
        return loaded.value;
    };
}
