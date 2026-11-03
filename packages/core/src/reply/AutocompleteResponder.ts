import { reportedWrite } from './responseReport';

import type { ReplyTelemetry } from './responseReport';

export class AutocompleteResponder<Choice> {
    private responded = false;

    constructor(
        private readonly telemetry: ReplyTelemetry,
        private readonly post: (choices: readonly Choice[]) => Promise<unknown>
    ) {}

    public async respond(choices: readonly Choice[]): Promise<void> {
        // set before the post because a handler can throw without awaiting this call
        this.responded = true;
        try {
            await reportedWrite(this.telemetry, 'respond', () => this.post(choices));
        } catch (error) {
            this.responded = false;
            throw error;
        }
    }

    // discord rejects a second response to one autocomplete
    public async clear(): Promise<void> {
        if (!this.responded) await this.respond([]);
    }
}
