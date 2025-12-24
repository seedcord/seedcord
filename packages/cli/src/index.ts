export {
    defineConfig,
    SEEDCORD_CONFIG_FILENAMES,
    type SeedcordBuildConfig,
    type SeedcordDevConfig
} from './config/schema';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
