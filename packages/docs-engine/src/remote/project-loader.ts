import { ProjectFetchError } from '@remote/errors';
import { validateProjectFile } from '@remote/project-file';

import type { Fetcher } from '@remote/index-loader';
import type { DocProjectFile } from '@remote/project-file';

const defaultFetcher: Fetcher = (url) => globalThis.fetch(url);

export class ProjectLoader {
    constructor(
        private readonly url: string,
        private readonly fetcher: Fetcher = defaultFetcher
    ) {}

    async load(): Promise<DocProjectFile> {
        const res = await this.fetcher(this.url);
        if (!res.ok) {
            throw new ProjectFetchError(res.status, `project.json fetch failed (${res.status}) at ${this.url}`);
        }

        return validateProjectFile(await res.json());
    }
}
