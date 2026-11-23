export const STAGE = 'beta';

export function stageNotice(affected: string): string {
    return `seedcord is in ${STAGE}, so a minor version can break ${affected}. Each release's changelog says what changed and how to update.`;
}
