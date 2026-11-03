import { reportedWrite } from './responseReport';

import type { ReplyTelemetry } from './responseReport';

export class AutocompleteResponder<Choice> {
    private attempt?: Promise<void>;

    constructor(
        private readonly telemetry: ReplyTelemetry,
        private readonly post: (choices: readonly Choice[]) => Promise<unknown>
    ) {}

    public respond(choices: readonly Choice[]): Promise<void> {
        this.attempt = reportedWrite(this.telemetry, 'respond', () => this.post(choices)).then(() => undefined);
        return this.attempt;
    }

    // discord rejects a second response to one autocomplete
    public async clear(): Promise<void> {
        const answered = await this.attempt?.then(
            () => true,
            () => false
        );
        if (!answered) await this.respond([]);
    }
}
