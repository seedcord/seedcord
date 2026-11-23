// what the OAuth and Linked Roles plugins share. it's an entry of its own because the main one imports
// reflect-metadata, and a plugin that bundles that entry has to install it
export { discordClientSecret } from './discordClientSecret';
export { warnUnlessRedirectListed } from './warnUnlessRedirectListed';
