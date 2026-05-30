import { LoggerChannelRegistry } from '@seedcord/services';
import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import type { ReactElement } from 'react';

interface ChannelSelectorProps {
    readonly onSelect: (channel: string | undefined) => void;
    readonly onClose: () => void;
    readonly currentChannel: string | undefined;
}

export function ChannelSelector({ onSelect, onClose, currentChannel }: ChannelSelectorProps): ReactElement {
    const [channels] = useState(() => {
        const allChannels = LoggerChannelRegistry.instance.getChannels();
        return ['All Channels', ...allChannels];
    });

    const [selectedIndex, setSelectedIndex] = useState(() => {
        const currentIndex = currentChannel ? channels.indexOf(currentChannel) : 0;
        return currentIndex >= 0 ? currentIndex : 0;
    });

    useInput((_input, key) => {
        // Close on escape only. `c` is the parent's open key; handling it here too would double-fire the moment
        // the parent stopped guarding against it. The footer advertises esc as the close key.
        if (key.escape) {
            onClose();
            return;
        }

        if (key.return) {
            const selected = channels[selectedIndex];
            onSelect(selected === 'All Channels' ? undefined : selected);
            onClose();
            return;
        }

        if (key.upArrow) {
            setSelectedIndex((prev) => (prev === 0 ? channels.length - 1 : prev - 1));
        }

        if (key.downArrow) {
            setSelectedIndex((prev) => (prev === channels.length - 1 ? 0 : prev + 1));
        }
    });

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="blue">
            <Box marginTop={-1} marginLeft={1}>
                <Text bold> Select Channel </Text>
            </Box>
            {channels.map((channel, index) => (
                <Text key={channel} color={index === selectedIndex ? 'green' : 'white'}>
                    {index === selectedIndex ? '> ' : '  '}
                    {channel}
                </Text>
            ))}
        </Box>
    );
}
