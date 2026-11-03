import { reportedWrite } from './responseReport';

import type { ReplyTelemetry } from './responseReport';

export class AutocompleteResponder<Choice> {
    private responded = false;

    constructor(
        private readonly telemetry: ReplyTelemetry,
        private readonly post: (choices: readonly Choice[]) => Promise<unknown>
    ) {}

    public async respond(choices: readonly Choice[]): Promise<void> {
        await reportedWrite(this.telemetry, 'respond', () => this.post(choices));
        this.responded = true;
    }

    // discord rejects a second response to one autocomplete
    public async clear(): Promise<void> {
        if (!this.responded) await this.respond([]);
    }
}
