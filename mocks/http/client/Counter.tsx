import { useEffect, useState } from 'react';

const MS_PER_SECOND = 1000;

export function Counter({ startedAt }: { startedAt: number }): React.JSX.Element {
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), MS_PER_SECOND);
        return () => clearInterval(timer);
    }, []);

    return <h1>Running for {Math.round((now - startedAt) / MS_PER_SECOND)}s</h1>;
}
