/* eslint-disable no-console -- CLI script */
import { Converters, Envapter } from 'envapt';

import { RailwayRedeploy } from '#src/docs/RailwayRedeploy';
import { CliFlags } from '#src/lib/CliFlags';

const flags = new CliFlags('pnpm docs:redeploy --service <name>', {
    service: { type: 'string', describe: 'Railway service to redeploy, by name' }
});

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const { service } = flags.parse(argv);
    if (!service) throw new Error('pass --service <name>');

    console.log(`redeploying ${service}`);
    // a project token scoped to the environment that serves the docs
    const token = Envapter.getRequired('RAILWAY_TOKEN', Converters.String);
    const id = await new RailwayRedeploy(token).redeploy(service);
    console.log(`✅ deployment ${id} is serving`);
}

main().catch((error: unknown) => {
    console.error('\n❌ redeploy-docs.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
