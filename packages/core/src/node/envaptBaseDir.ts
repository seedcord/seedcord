import { botConfigDir, setBuiltFilesHook } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';

export function setEnvaptBaseDir(): void {
    setBuiltFilesHook(() => {
        const configDir = botConfigDir();
        if (configDir !== undefined && Envapter.source.supportsFiles) Envapter.baseDir = configDir;
    });
}
