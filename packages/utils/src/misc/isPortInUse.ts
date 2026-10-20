import { hasErrorCode } from './hasErrorCode';

export function isPortInUse(error: unknown): boolean {
    return hasErrorCode(error, 'EADDRINUSE');
}
