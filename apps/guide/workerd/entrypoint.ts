import { WorkerEntrypoint } from 'cloudflare:workers';

import { GuideAnswers } from '#lib/GuideAnswers';

// eslint-disable-next-line no-restricted-imports -- the app root doesn't have an alias
import handler from '../worker';

import type { GuideAnswer, GuideService } from '@seedcord/docs-search';

export default class GuideWorker extends WorkerEntrypoint<Env> implements GuideService {
    public override fetch(request: Request): Promise<Response> {
        return handler.fetch(request, this.env, this.ctx);
    }

    public ask(question: string): Promise<GuideAnswer> {
        return new GuideAnswers(this.env).ask(question);
    }
}
