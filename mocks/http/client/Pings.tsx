import { useSyncExternalStore } from 'react';

let runs: number | undefined;

// EventSource reconnects by itself while the bot restarts
function subscribe(onChange: () => void): () => void {
    const events = new EventSource('/api/pings');
    events.addEventListener('message', ({ data }: MessageEvent<string>) => {
        runs = Number(data);
        onChange();
    });
    return () => events.close();
}

export function Pings(): React.JSX.Element {
    const current = useSyncExternalStore(subscribe, () => runs);

    return <p>/ping ran {current ?? '…'} times</p>;
}
