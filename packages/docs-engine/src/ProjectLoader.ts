import fs from 'node:fs/promises';

import { ConsoleLogger, Deserializer, FileRegistry } from 'typedoc';

import type { JSONOutput, Logger, ProjectReflection } from 'typedoc';

export interface ProjectLoaderOptions {
    logger?: Logger;
}

export class ProjectLoader {
    private readonly logger: Logger;
    private readonly deserializer: Deserializer;

    constructor(options: ProjectLoaderOptions = {}) {
        this.logger = options.logger ?? new ConsoleLogger();
        this.deserializer = new Deserializer(this.logger);
    }

    async fromFile(jsonPath: string): Promise<ProjectReflection> {
        const raw = await fs.readFile(jsonPath, 'utf8');
        const payload = JSON.parse(raw) as JSONOutput.ProjectReflection;

        return this.fromObject(payload);
    }

    fromObject(payload: JSONOutput.ProjectReflection): ProjectReflection {
        const registry = new FileRegistry();

        return this.deserializer.reviveProject(payload.name, payload, {
            projectRoot: '/',
            registry
        });
    }
}
