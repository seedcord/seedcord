// the files vite's loadEnv reads from envDir
export function viteEnvFiles(mode: string): string[] {
    return ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
}
