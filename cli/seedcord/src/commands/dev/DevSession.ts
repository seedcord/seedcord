import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { SeedcordBrand, type Brandable, type SeedcordInstance } from '@seedcord/types/internal';
import chalk from 'chalk';

import { profileMark } from '#ui/profile';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { TscRunner } from './TscRunner';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevRuntime } from './runtime/DevRuntime';
import type { DevEventHandler } from './runtime/events';

function isSeedcordInstance(candidate: unknown): candidate is SeedcordInstance {
    return typeof candidate === 'object' && candidate !== null && (candidate as Brandable)[SeedcordBrand] === true;
}

export class DevSession {
    private stopResolve?: () => void;
    private instance?: SeedcordInstance;
    private isStopped = false;
    private startupPromise?: Promise<unknown>;
    private tscRunner?: TscRunner;
    private stopPromise?: Promise<void>;

    constructor(
        private readonly config: ResolvedSeedcordDevConfig,
        private readonly runtime: DevRuntime,
        private readonly store: DevStore,
        private readonly onEvent: DevEventHandler
    ) {}

    private async loadInstanceModule(): Promise<unknown> {
        await this.runtime.start({
            config: this.config,
            onEvent: (event) => {
                this.store.apply(event);
                this.onEvent(event);
            }
        });
        profileMark('vite');

        // vite's missing-entry message changed across a minor and broke detection
        if (!existsSync(this.config.instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [this.config.instance]);
        }

        try {
            const { module } = await this.runtime.loadEntry();
            profileMark('entry');
            return module;
        } catch (error: unknown) {
            const message = Error.isError(error) ? error.message : String(error);
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, message]);
        }
    }

    private startTypecheck(): void {
        const { typecheck } = this.config;
        if (!typecheck.enabled) return;

        this.tscRunner = new TscRunner(typecheck.tsconfig, dirname(this.config.configFile));
        this.tscRunner.start();
    }

    public async start(onReady?: () => void): Promise<void> {
        const module = await this.loadInstanceModule();
        const exported = resolveDefaultExport(module);
        const instance = await Promise.resolve(exported);

        if (!isSeedcordInstance(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        this.instance = instance;
        this.store.setFrameworkVersion(instance.version);

        try {
            this.store.setPhase('starting');
            this.store.setStatus('Starting Seedcord instance…');
            this.startupPromise = Promise.resolve(instance.start());
            await this.startupPromise;

            if (this.isStopped) {
                return;
            }

            this.store.setPhase('running');
            this.store.setStatus(`${chalk.bold(instance.username ?? 'Bot')} is ready!`);
            profileMark('ready');
            onReady?.();
            // tsc competes with vite's cold transform when it starts any earlier
            this.startTypecheck();

            // resolved by stop(), and no signal handlers here so restarts never accumulate listeners
            await new Promise<void>((resolve) => {
                this.stopResolve = resolve;
            });
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [this.config.instance, reason]);
        }
    }

    // quit, restart, disconnect, and dispose all call this
    public async stop(): Promise<void> {
        this.stopPromise ??= this.runStop();
        return this.stopPromise;
    }

    private async runStop(): Promise<void> {
        this.isStopped = true;
        this.tscRunner?.stop();
        this.instance?.startup.abort();

        if (this.startupPromise) {
            // so the shutdown below still runs
            try {
                await this.startupPromise;
            } catch {}
        }

        await this.instance?.shutdown.run(0, false);
        this.stopResolve?.();
    }

    public async dispose(): Promise<void> {
        await this.stop();
        await this.runtime.dispose();
    }

    public refreshCommands(shouldRefresh: boolean): void {
        this.runtime.refreshCommands?.(shouldRefresh);
    }
}
