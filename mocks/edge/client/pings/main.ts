import './pings.css';

function element(id: string): HTMLElement {
    const found = document.getElementById(id);
    if (!found) throw new Error(`index.html doesn't have #${id}`);
    return found;
}

const response = await fetch('/api/pings');
if (!response.ok) throw new Error(`/api/pings answered ${String(response.status)}`);
const { runs } = (await response.json()) as { runs: number };
element('runs').textContent = `Pings so far: ${String(runs)}`;
element('opened').textContent = `Opened at ${new Date().toLocaleTimeString()}`;
