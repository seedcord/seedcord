// logs and errors get the path only because a query can hold a secret, like an OAuth callback's code
export function requestPath(url: string): string {
    return new URL(url, 'http://localhost').pathname;
}
