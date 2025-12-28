/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-statements */
/* eslint-disable complexity */
import { Logger } from '@seedcord/services';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

import { Banner, LogPanel, StatusLine } from '@ui/components';

import { DELAY, sleep } from '../utils';

import type { ReactElement } from 'react';

const logger = new Logger('vite-demo');

interface ViteDemoProps {
    readonly onComplete: () => void;
}

export function ViteDemo({ onComplete }: ViteDemoProps): ReactElement {
    const [status, setStatus] = useState<string | null>(null);
    const [spinner, setSpinner] = useState(false);
    const [content, setContent] = useState<React.ReactNode>(null);

    useEffect(() => {
        let mounted = true;

        const run = async (): Promise<void> => {
            // Optimize Deps
            if (!mounted) return;
            setStatus('Optimizing dependencies...');
            setSpinner(true);
            await sleep(DELAY.short);

            if (!mounted) return;
            setStatus('Optimizing dependencies (esbuild)');
            await sleep(DELAY.short);

            if (!mounted) return;
            setSpinner(false);
            setStatus('Deps optimized');
            setContent(
                <Box flexDirection="column">
                    <Text color="greenBright">{'>'} Dependency optimization done:</Text>
                    <Text color="white"> react, react-dom, vite, typescript</Text>
                </Box>
            );
            logger.info('Dependency optimization finished for client bundle');

            // Start Server
            if (!mounted) return;
            setStatus('Starting dev server...');
            setSpinner(true);
            await sleep(DELAY.brief);

            if (!mounted) return;
            setStatus('Loading config...');
            await sleep(DELAY.brief);

            if (!mounted) return;
            setStatus('Building client entry...');
            await sleep(DELAY.short);

            if (!mounted) return;
            setSpinner(false);
            setStatus('Dev server ready, press h for help');
            setContent(
                <Box flexDirection="column">
                    <Text color="greenBright">Server ready in 1.24 s</Text>
                    <Text color="cyan">Watching files in ./src</Text>
                    <Text>
                        Mode: <Text color="magenta">development</Text>
                    </Text>
                    <Text>
                        Env: <Text color="magenta">local</Text>
                    </Text>
                </Box>
            );
            logger.info('Dev server started and listening on http://localhost:5173');

            // Show Routes
            await sleep(DELAY.medium);
            if (!mounted) return;
            setContent(
                <Box flexDirection="column">
                    <Text bold>Routes</Text>
                    <Text>
                        {' '}
                        / <Text dimColor>index.html</Text>
                    </Text>
                    <Text>
                        {' '}
                        /about <Text dimColor>src/pages/about.tsx</Text>
                    </Text>
                    <Text>
                        {' '}
                        /api/health <Text dimColor>src/api/health.ts</Text>
                    </Text>
                    <Text>
                        {' '}
                        /api/posts <Text dimColor>src/api/posts.ts</Text>
                    </Text>
                    <Text> </Text>
                    <Text dimColor>HMR updates: waiting for changes...</Text>
                </Box>
            );

            // Simulate HMR
            await sleep(DELAY.medium);
            if (!mounted) return;
            logger.info(
                '(Special) File change detected:',
                'src/components/Button.tsx',
                'And some extra data',
                '\nAnd some more extra data'
            );

            setStatus('[HMR] Applying update');
            setSpinner(true);
            await sleep(DELAY.brief);

            if (!mounted) return;
            setSpinner(false);
            setStatus('HMR applied');
            setContent(
                <Box flexDirection="column">
                    <Text bold>HMR updates:</Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/components/Button.tsx <Text dimColor>(48ms)</Text>
                    </Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/pages/index.tsx <Text dimColor>(32ms)</Text>
                    </Text>
                </Box>
            );

            await sleep(DELAY.medium);
            if (!mounted) return;
            logger.info('File change detected: src/pages/about.tsx');

            setStatus('[HMR] Applying update');
            setSpinner(true);
            await sleep(DELAY.brief);

            if (!mounted) return;
            setSpinner(false);
            setStatus('HMR applied');
            setContent(
                <Box flexDirection="column">
                    <Text bold>HMR updates:</Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/components/Button.tsx <Text dimColor>(48ms)</Text>
                    </Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/pages/index.tsx <Text dimColor>(32ms)</Text>
                    </Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/pages/about.tsx <Text dimColor>(41ms)</Text>
                    </Text>
                </Box>
            );
            setStatus('Idle');

            // Simulate Rebuild
            await sleep(DELAY.medium);
            if (!mounted) return;
            logger.warn('Full rebuild triggered by src/hooks/useUser.ts');

            setStatus('Rebuilding...');
            setSpinner(true);
            await sleep(DELAY.brief);

            if (!mounted) return;
            setStatus('Rebuilding (esbuild)');
            await sleep(DELAY.short);

            if (!mounted) return;
            setSpinner(false);
            setStatus('Rebuild complete');
            setContent(
                <Box flexDirection="column">
                    <Text bold>Rebuild complete:</Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/hooks/useUser.ts <Text dimColor>(132ms)</Text>
                    </Text>
                    <Text>
                        {' '}
                        <Text color="green">✓</Text> src/pages/profile.tsx <Text dimColor>(97ms)</Text>
                    </Text>
                </Box>
            );
            logger.info('Rebuild finished successfully');
            setStatus('Ready');

            // Shutdown
            await sleep(DELAY.long);
            if (!mounted) return;
            logger.info('Shutting down dev server');
            setStatus('Shutting down dev server...');
            setSpinner(true);
            await sleep(DELAY.brief);

            if (!mounted) return;
            setSpinner(false);
            setStatus('Server stopped');

            await sleep(DELAY.brief);
            if (mounted) onComplete();
        };

        void run();

        return () => {
            mounted = false;
        };
    }, [onComplete]);

    return (
        <Box flexDirection="column">
            <Banner config={null} />
            <Box marginY={1} flexDirection="column" minHeight={10}>
                {content}
            </Box>
            <LogPanel channel="default" height={12} title={chalk.bold('Logger')} />
            <Box marginTop={1}>
                {status && <StatusLine text={status} spinner={spinner} color={spinner ? 'yellow' : 'green'} />}
            </Box>
        </Box>
    );
}
