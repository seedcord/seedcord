import type { Config } from 'typescript-eslint';

export interface CreateConfigOptions {
  tsconfigRootDir?: string;
  userConfigs?: Config[];
}

declare function createConfig(options?: CreateConfigOptions): Config[];

export default createConfig;
