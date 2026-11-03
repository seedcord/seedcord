// a failed load runs again on the next call
export function loadOnce<Args extends unknown[], Loaded>(
    load: (...args: Args) => Promise<Loaded>
): (...args: Args) => Promise<Loaded> {
    let loading: Promise<Loaded> | undefined;
    return (...args) => {
        loading ??= load(...args).catch((error: unknown) => {
            loading = undefined;
            throw error;
        });
        return loading;
    };
}
