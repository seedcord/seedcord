export function isGetOrHead(method: string | undefined): boolean {
    return method === 'GET' || method === 'HEAD';
}
