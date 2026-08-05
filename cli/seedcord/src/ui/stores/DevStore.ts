import { TypedEventEmitter } from '@seedcord/event-emitter';
import { assertNever } from '@seedcord/utils';

import type { DevPhase } from './devPhase';
import type { DevEvent } from '@commands/dev/runtime/events';
import type { TunnelStatus } from '@commands/dev/tunnel/TunnelCoordinator';

export interface DevState {
    readonly phase: DevPhase;
    readonly status: string;
    readonly error: Error | null;
    readonly isBusy: boolean;
    readonly frameworkVersion: string | null;
    readonly restartRequired: boolean;
    readonly commandUpdatePrompt: string[] | null;
    readonly port: number | null;
    readonly tunnel: TunnelStatus | null;
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
    tunnel: null
};

export class DevStore extends TypedEventEmitter<{ change: [] }> {
    private state: DevState = INITIAL;

    // a stable reference between mutations, which useSyncExternalStore needs to avoid render loops
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

    public setTunnel(tunnel: TunnelStatus | null): void {
        this.patch({ tunnel });
    }

    public clearPrompt(): void {
        this.patch({ commandUpdatePrompt: null });
    }

    // one patch, so the r/d press costs a single render before the runner swaps sessions
    public beginRestart(): void {
        this.patch({
            phase: 'starting',
            isBusy: true,
            restartRequired: false,
            error: null,
            status: 'Restarting…',
            port: null
        });
    }

    public beginDisconnect(): void {
        this.patch({
            phase: 'disconnected',
            isBusy: true,
            restartRequired: false,
            error: null,
            status: 'Disconnecting…',
            port: null
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
