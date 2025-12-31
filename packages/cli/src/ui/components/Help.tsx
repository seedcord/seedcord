import { Box, Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

export function Help(): ReactElement {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={0.5}>
            <Text bold>Available Commands:</Text>
            <Box flexDirection="column" marginLeft={2} marginTop={-1}>
                <Text>
                    <Text color="cyan" bold>
                        q
                    </Text>{' '}
                    - Quit CLI (graceful shutdown)
                </Text>
                <Text>
                    <Text color="cyan" bold>
                        d
                    </Text>{' '}
                    - Disconnect bot (stop instance)
                </Text>
                <Text>
                    <Text color="cyan" bold>
                        r
                    </Text>{' '}
                    - Restart bot instance
                </Text>
                <Text>
                    <Text color="cyan" bold>
                        c
                    </Text>{' '}
                    - Switch log channels
                </Text>
                <Text>
                    <Text color="cyan" bold>
                        h
                    </Text>{' '}
                    - Toggle Help
                </Text>
                <Text>
                    <Text color="cyan" bold>
                        l
                    </Text>{' '}
                    - Clear All Logs
                </Text>
            </Box>
        </Box>
    );
}
