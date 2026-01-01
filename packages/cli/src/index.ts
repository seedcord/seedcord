export {
    defineConfig,
    SEEDCORD_CONFIG_FILENAMES,
    type SeedcordBuildConfig,
    type SeedcordDevConfig
} from '@core/config/schema';

export type * from '@api/Hmr';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
