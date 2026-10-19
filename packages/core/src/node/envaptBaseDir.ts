import { builtConfigDir, setBuiltFilesHook } from '@seedcord/utils/node/internal';
import { Envapter } from 'envapt';

export function setEnvaptBaseDir(): void {
    setBuiltFilesHook(() => {
        const configDir = builtConfigDir();
        if (configDir !== undefined) Envapter.baseDir = configDir;
    });
}
