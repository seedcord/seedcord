import { installNodeDefaults } from '@seedcord/logger/node';

// the gateway runs on node, install the winston sinks before any logging
installNodeDefaults();
