import { createRoot } from 'react-dom/client';

import { Counter } from '../Counter';
import { Pings } from '../Pings';
import './uptime.css';

const response = await fetch('/api/uptime');
if (!response.ok) throw new Error(`/api/uptime answered ${String(response.status)}`);
const { startedAt } = (await response.json()) as { startedAt: number };

const root = document.getElementById('uptime');
if (!root) throw new Error("index.html doesn't have #uptime");

createRoot(root).render(
    <>
        <Counter startedAt={startedAt} />
        <Pings />
    </>
);
