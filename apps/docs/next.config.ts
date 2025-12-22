import type { NextConfig } from 'next';

interface MutableWebpackConfig {
    module?: {
        rules?: { test: RegExp; parser?: { exprContextCritical?: boolean } }[];
    };
}

const nextConfig: NextConfig = {
    serverExternalPackages: ['@seedcord/docs-engine', '@seedcord/docs-generator', 'typedoc'],
    webpack: <ConfigType extends MutableWebpackConfig>(
        config: ConfigType,
        { isServer }: { isServer: boolean }
    ): ConfigType => {
        if (isServer) {
            const mutable = config as MutableWebpackConfig;
            mutable.module ??= {};
            mutable.module.rules ??= [];
            mutable.module.rules.push({
                test: /typedoc[/\\]dist[/\\]lib[/\\]utils[/\\]plugins\.js$/u,
                parser: { exprContextCritical: false }
            });
        }

        return config;
    },
    turbopack: {}
};

export default nextConfig;
