import { WriteAttempt } from './WriteAttempt';

import type { ReplyTelemetry } from './responseReport';

export class AutocompleteResponder<Choice> {
    private attempt?: Promise<void>;

    constructor(
        private readonly telemetry: ReplyTelemetry,
        private readonly post: (choices: readonly Choice[]) => Promise<unknown>
    ) {}

    public respond(choices: readonly Choice[]): Promise<void> {
        const write = new WriteAttempt(this.telemetry);
        const respond = { method: 'respond', body: null } as const;
        this.attempt = write.run(respond, () => this.post(choices)).then(() => write.sent(respond, null));
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
