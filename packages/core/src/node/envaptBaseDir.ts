import { builtConfigDir, onBuiltFiles } from '@seedcord/utils/node/internal';
import { Envapter } from 'envapt';

export function setEnvaptBaseDir(): void {
    onBuiltFiles(() => {
        const configDir = builtConfigDir();
        if (configDir !== undefined) Envapter.baseDir = configDir;
    });
}
