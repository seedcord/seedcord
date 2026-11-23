import { Plugin } from '@seedcord/http';

import type { DispatchOrigin } from '@seedcord/http';

export class PingCounter extends Plugin {
    public override readonly dispatchMembers = {
        askedIn: (origin: DispatchOrigin): string => origin.userLocale ?? 'unknown'
    };

    private runs = 0;

    public init(): Promise<void> {
        return Promise.resolve();
    }

    public bump(): number {
        this.runs++;
        return this.runs;
    }
}
