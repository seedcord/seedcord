import { installNodeDefaults } from '@seedcord/logger/node';

// the gateway runs on node so install the winston sinks before any logging
installNodeDefaults();
