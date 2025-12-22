import { resolve } from 'path';

import { createFile } from './utils';

// TODO: move components to their files
const components: Record<string, string> = {
    mock: `@RegisterCommand('global')
export class TemplateCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('template')
      .setDescription('Template command')
  }
}\n`
};

export const availableComponents: string[] = [];
const minNameLength = 3;

for (const component in components) {
    if (Object.hasOwn(components, component)) availableComponents.push(component);
}

export async function createComponent(path: string, name: string, template: string): Promise<void> {
    if (!components[template])
        throw new Error(`unable to find template: available templates are ${availableComponents.join(', ')}`);
    if (name.length < minNameLength) throw new Error(`component name is lower than ${minNameLength} characters`);
    const commandName = name.toLowerCase();
    // TODO: do not hardcode casing replacement, maybe create a command for that
    const commandTemplate = components[template]
        .replaceAll('template', commandName)
        // maybe there is a function for pascal case
        .replaceAll('Template', commandName[0]?.toUpperCase() + commandName.slice(1));
    await createFile(resolve(path, `${name}.ts`), commandTemplate);
}
