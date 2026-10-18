import { builtEnvDir } from '@seedcord/utils/node/internal';
import { Envapter } from 'envapt';

export function setEnvaptBaseDir(): void {
    const envDir = builtEnvDir();
    if (envDir !== undefined) Envapter.baseDir = envDir;
}
