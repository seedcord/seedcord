export function withoutQuery(moduleId: string): string {
    const queryStart = moduleId.indexOf('?');
    return queryStart === -1 ? moduleId : moduleId.slice(0, queryStart);
}
