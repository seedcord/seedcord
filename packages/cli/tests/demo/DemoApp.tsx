import { useApp } from 'ink';
import { useEffect, useState } from 'react';

import { LogStore } from '@ui/stores/LogStore';

import { ChannelSwitchingDemo } from './demos/ChannelSwitchingDemo';
import { HighVolumeDemo } from './demos/HighVolumeDemo';
import { ViteDemo } from './demos/ViteDemo';

import type { ReactElement } from 'react';

export function DemoApp(): ReactElement | null {
    const [stage, setStage] = useState(0);
    const { exit } = useApp();

    useEffect(() => {
        LogStore.instance.clear();
        LogStore.instance.mount();
        return () => {
            LogStore.instance.unmount();
        };
    }, []);

    useEffect(() => {
        if (stage > 2) {
            exit();
        }
    }, [stage, exit]);

    const next = (): void => setStage((s) => s + 1);

    if (stage === 0) return <ViteDemo onComplete={next} />;
    if (stage === 1) return <ChannelSwitchingDemo onComplete={next} />;
    if (stage === 2) return <HighVolumeDemo onComplete={next} />;

    return null;
}
