/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-magic-numbers */
import { Logger } from '@seedcord/services';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

import { LogPanel, StatusLine } from '@ui/components';
import { LogStore } from '@ui/stores/LogStore';

import { DELAY, sleep } from '../utils';

import type { ReactElement } from 'react';

const logger = new Logger('channel-switch');
const CHANNELS = ['build', 'hmr', 'auth'] as const;

interface ChannelSwitchingDemoProps {
    readonly onComplete: () => void;
}

export function ChannelSwitchingDemo({ onComplete }: ChannelSwitchingDemoProps): ReactElement {
    const [currentChannel, setCurrentChannel] = useState<(typeof CHANNELS)[number]>(CHANNELS[0]);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        let mounted = true;

        const playChannel = async (channel: (typeof CHANNELS)[number]): Promise<void> => {
            if (!mounted) return;
            logger.setChannel(channel);
            setStatus(`Streaming ${channel} logs...`);

            logger.info('Attached to "%s"', channel);
            await sleep(DELAY.brief);

            if (!mounted) return;
            logger.info('Fetching configuration');
            await sleep(DELAY.brief);

            if (!mounted) return;
            logger.warn('Minor latency spike detected');
            await sleep(DELAY.brief);

            if (!mounted) return;
            logger.info('Ready');
            await sleep(DELAY.brief);
        };

        const run = async (): Promise<void> => {
            LogStore.instance.clear(CHANNELS[0]);
            await playChannel(CHANNELS[0]);

            for (let i = 1; i < CHANNELS.length; i++) {
                if (!mounted) return;
                const channel = CHANNELS[i];
                if (!channel) continue;

                LogStore.instance.clear(channel);
                setCurrentChannel(channel);
                await playChannel(channel);
            }

            if (!mounted) return;
            setStatus('Channel switching demo complete');
            await sleep(700);
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
                <Text bold>Channel Switching Demo</Text>
                <Text dimColor>Header stays put, logs reset per channel</Text>
                <Text color="green">Current channel: {currentChannel}</Text>
                <Text dimColor>Channels: {CHANNELS.join(', ')}</Text>
            </Box>

            <LogPanel channel={currentChannel} height={15} title={chalk.bold('Logs')} />

            <Box marginTop={1}>
                <StatusLine text={status} color="yellow" />
            </Box>
        </Box>
    );
}
