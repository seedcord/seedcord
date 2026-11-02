import { WorkerEntrypoint } from 'cloudflare:workers';

import { GuideAnswers } from './src/lib/GuideAnswers';
import handler from './worker';

import type { GuideEnv } from './src/lib/ask';
import type { GuideAnswer, GuideService } from '@seedcord/docs-search';

export default class GuideWorker extends WorkerEntrypoint<GuideEnv> implements GuideService {
    public override fetch(request: Request): Promise<Response> {
        return handler.fetch(request, this.env, this.ctx);
    }

    public ask(question: string): Promise<GuideAnswer> {
        return new GuideAnswers(this.env).ask(question);
    }
}
