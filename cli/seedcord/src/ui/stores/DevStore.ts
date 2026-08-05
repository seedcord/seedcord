import { TypedEventEmitter } from '@seedcord/event-emitter';
import { assertNever } from '@seedcord/utils';

import type { DevPhase } from './devPhase';
import type { DevEvent } from '@commands/dev/runtime/events';

export interface DevState {
    readonly phase: DevPhase;
    readonly status: string;
    readonly error: Error | null;
    readonly isBusy: boolean;
    readonly frameworkVersion: string | null;
    readonly restartRequired: boolean;
    readonly commandUpdatePrompt: string[] | null;
    readonly port: number | null;
    readonly tunnelUrl: string | null;
}

const INITIAL: DevState = {
    phase: 'starting',
    status: 'Initializing…',
    error: null,
    isBusy: true,
    frameworkVersion: null,
    restartRequired: false,
    commandUpdatePrompt: null,
    port: null,
    tunnelUrl: null
};

// Single source of truth for the dev UI. The runner pushes scalar updates through the setters, and runtime
// events reduce through `apply`. `getState` returns a stable reference between mutations, which
// `useSyncExternalStore` requires to avoid render loops.
export class DevStore extends TypedEventEmitter<{ change: [] }> {
    private state: DevState = INITIAL;

    public getState(): DevState {
        return this.state;
    }

    public setStatus(status: string): void {
        this.patch({ status });
    }

    public setBusy(isBusy: boolean): void {
        this.patch({ isBusy });
    }

    public setPhase(phase: DevPhase): void {
        this.patch({ phase });
    }

    public setError(error: Error | null): void {
        this.patch({ error });
    }

    public setFrameworkVersion(frameworkVersion: string | null): void {
        this.patch({ frameworkVersion });
    }

    public setTunnelUrl(tunnelUrl: string | null): void {
        this.patch({ tunnelUrl });
    }

    public clearPrompt(): void {
        this.patch({ commandUpdatePrompt: null });
    }

    // Optimistic UI transitions: the user pressed r/d, so reset to a busy "reconnecting" state in one atomic
    // patch (one render) before the runner stops the session and starts the next one.
    public beginRestart(): void {
        this.patch({ phase: 'starting', isBusy: true, restartRequired: false, error: null, status: 'Restarting…' });
    }

    public beginDisconnect(): void {
        this.patch({
            phase: 'disconnected',
            isBusy: true,
            restartRequired: false,
            error: null,
            status: 'Disconnecting…'
        });
    }

    public beginQuit(): void {
        this.patch({ phase: 'quitting', isBusy: true, status: 'Shutting down…' });
    }

    public apply(event: DevEvent): void {
        switch (event.type) {
            case 'restart-required': {
                this.patch({
                    phase: 'restart-required',
                    status: 'Restart required. Press r to restart.',
                    restartRequired: true
                });
                break;
            }
            case 'command-update-prompt': {
                this.patch({ commandUpdatePrompt: event.files });
                break;
            }
            case 'server-listening': {
                this.patch({ port: event.port });
                break;
            }
            case 'module-loading':
            case 'module-loaded':
            case 'module-error':
            case 'file-change':
            case 'ready': {
                break;
            }
            default: {
                assertNever(event);
            }
        }
    }

    private patch(next: Partial<DevState>): void {
        this.state = { ...this.state, ...next };
        this.emit('change');
    }
}
