export const DELAY = {
    brief: 900,
    short: 1200,
    medium: 1600,
    long: 2000
} as const;

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
