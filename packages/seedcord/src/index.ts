export {
    defineConfig,
    SEEDCORD_CONFIG_FILENAMES,
    type SeedcordBuildConfig,
    type SeedcordDevConfig,
    type SeedcordHmrConfig
} from '@core/config/schema';

/** Package version. Falls back to '0.0.0' when run unbuilt (dev); the real value is injected at build time. */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
