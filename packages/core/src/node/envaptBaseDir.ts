import { builtConfigDir } from '@seedcord/utils/node/internal';
import { Envapter } from 'envapt';

export function setEnvaptBaseDir(): void {
    const configDir = builtConfigDir();
    if (configDir !== undefined) Envapter.baseDir = configDir;
}
