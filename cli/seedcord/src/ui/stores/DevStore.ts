import { assertNever } from '@seedcord/utils';

import { ChangeStore } from './ChangeStore';
import { isSessionLive } from './devPhase';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { TunnelStatus } from '#commands/dev/tunnel/TunnelCoordinator';
import type { ResolvedTarget } from '#core/config/schema';
import type { Confirmable } from '#ui/confirms';
import type { DevPhase } from './devPhase';

export interface DevTransport {
    // the transport package, '@seedcord/gateway' or '@seedcord/http'
    readonly name: string;
    readonly version: string;
    readonly target: ResolvedTarget['kind'];
}

export interface DevState {
    readonly phase: DevPhase;
    readonly status: string;
    readonly error: Error | null;
    readonly isBusy: boolean;
    readonly transport: DevTransport | null;
    readonly restartRequired: boolean;
    readonly commandUpdatePrompt: string[] | null;
    readonly port: number | null;
    readonly tunnel: TunnelStatus | null;
    readonly armed: Confirmable | null;
    readonly idleAnimation: boolean;
    readonly liveSinceMs: number | null;
}

const INITIAL: DevState = {
    phase: 'starting',
    status: 'Initializing…',
    error: null,
    isBusy: true,
    transport: null,
    restartRequired: false,
    commandUpdatePrompt: null,
    port: null,
    tunnel: null,
    armed: null,
    idleAnimation: true,
    liveSinceMs: null
};

export class DevStore extends ChangeStore {
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

    public setTransport(transport: DevTransport | null): void {
        this.patch({ transport });
    }

    public setTunnel(tunnel: TunnelStatus | null): void {
        this.patch({ tunnel });
    }

    public setArmed(armed: Confirmable | null): void {
        this.patch({ armed });
    }

    public setIdleAnimation(idleAnimation: boolean): void {
        this.patch({ idleAnimation });
    }

    public clearPrompt(): void {
        this.patch({ commandUpdatePrompt: null });
    }

    // keeps the r/d press to a single render before the runner swaps sessions
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
            case 'progress': {
                this.patch({ status: event.status });
                break;
            }
            default: {
                assertNever(event);
            }
        }
    }

    private patch(next: Partial<DevState>): void {
        const merged = { ...this.state, ...next };
        const liveSinceMs = isSessionLive(merged.phase) ? (this.state.liveSinceMs ?? Date.now()) : null;
        const armed = merged.phase === this.state.phase ? merged.armed : null;
        this.state = { ...merged, liveSinceMs, armed };
        this.emit('change');
    }
}
