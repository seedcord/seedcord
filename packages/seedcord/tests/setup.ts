import 'reflect-metadata';

// the default reporters require these at boot, so a Seedcord booted in a test has them set
process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/1/aaa';
process.env.HANDLED_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/2/bbb';
