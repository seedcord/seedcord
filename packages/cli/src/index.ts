import * as p from '@clack/prompts';
import { program } from 'commander';

import { availableComponents, createComponent } from './create';
import { scaffoldQuestions, scaffoldProject } from './scaffold';
import { colors } from './utils';

program
    .name('@seedcord/cli')
    .description('cli for scaffolding seedcord projects and adding components (coming soon)')
    // TODO: maybe get version from package.json or remove it fully
    .version('0.0.0');

program
    .command('scaffold')
    .description('scaffold a seedcord project')
    .option('-t --tools [TOOLS]', "tools to install, separated by comma, example: 'scaffold -t prettier'", 'prettier')
    .option('-i --install [BOOLEAN]', 'install deps automatically', undefined)
    .option('-p --path [PATH]', 'path to install', '')
    .addHelpText('after', 'when not specifying options, interactive questions will be asked')
    .action(async (args) => {
        if (args.path) {
            await scaffoldProject(
                {
                    path: args.path.toString(),
                    projectTools: args.tools.toString().split(','),
                    installDeps: Boolean(args.install)
                },
                p
            );
        } else await scaffoldQuestions();
    });

program
    .command('create')
    .description('create a template component')
    .argument('<path>', 'path for copying template component to')
    .addHelpText('after', `\nAvailable templates: ${colors.cyan(availableComponents.join(', '))}`)
    // TODO: create both handler and component
    .argument('[name]', 'name of created component', 'newCommand')
    .option('-t --template <TYPE>', 'select template', 'mock')
    .action(async (path, name, args) => {
        const template = args.template;
        await createComponent(path, name, template);
    });

program.parse();
