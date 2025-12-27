/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-magic-numbers */
import { Logger, LoggerChannelRegistry } from '@seedcord/services';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

import { LogPanel, StatusLine } from '@ui/components';

import { DELAY, sleep } from '../utils';

import type { ReactElement } from 'react';

const logger = new Logger('high-volume', { channel: 'high-vol' });

interface HighVolumeDemoProps {
    readonly onComplete: () => void;
}

export function HighVolumeDemo({ onComplete }: HighVolumeDemoProps): ReactElement {
    const [status, setStatus] = useState<string>('');
    const [spinner, setSpinner] = useState(false);
    const [logFilePath, setLogFilePath] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const run = async (): Promise<void> => {
            const path = LoggerChannelRegistry.instance.getLogFilePath('high-vol');
            if (path) setLogFilePath(path);

            setStatus('Generating 300 logs...');
            setSpinner(true);

            for (let i = 1; i <= 300; i++) {
                if (!mounted) return;
                logger.info(`Log entry #${i}: Processing item ${i} of 300`);

                if (!path) {
                    const newPath = LoggerChannelRegistry.instance.getLogFilePath('high-vol');
                    if (newPath) setLogFilePath(newPath);
                }

                if (i % 10 === 0) {
                    await sleep(50);
                }
            }

            if (!mounted) return;
            setSpinner(false);
            setStatus('Generated 300 logs successfully');

            await sleep(DELAY.long);
            if (mounted) onComplete();
        };

        void run();

        return () => {
            mounted = false;
        };
    }, [onComplete]);

    return (
        <Box flexDirection="column">
            <Box flexDirection="column" paddingBottom={1}>
                <Text bold>High Volume Logging Demo</Text>
                <Text dimColor>Testing TUI with 300 rapid log entries</Text>
                {logFilePath && <Text dimColor>Log file: {logFilePath}</Text>}
            </Box>

            <LogPanel channel="high-vol" height={20} title={chalk.bold('High Volume Log Test')} />

            <Box marginTop={1}>
                <StatusLine text={status} spinner={spinner} color={spinner ? 'yellow' : 'green'} />
            </Box>
        </Box>
    );
}
