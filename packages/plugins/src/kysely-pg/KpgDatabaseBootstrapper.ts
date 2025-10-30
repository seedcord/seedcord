import chalk from 'chalk';
import { Pool, type PoolConfig } from 'pg';

import type { Logger } from 'seedcord';

/**
 * Handles ensuring the target Postgres database exists, creating it if necessary.
 */
export class KpgDatabaseBootstrapper {
    private static readonly ADMIN_DB = 'postgres';
    private static readonly DATABASE_EXISTS_SQL =
        'SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"';

    constructor(private readonly logger: Logger) {}

    public resolveDatabaseName(config: PoolConfig): string | null {
        return KpgDatabaseBootstrapper.parseDatabaseName(config);
    }

    public resolveDatabaseFromPool(pool: Pool): string | null {
        const config: PoolConfig = {};

        const { options } = pool;

        if (typeof options.database === 'string') {
            config.database = options.database;
        }

        if (typeof options.connectionString === 'string') {
            config.connectionString = options.connectionString;
        }

        return this.resolveDatabaseName(config);
    }

    public async ensure(baseConfig: PoolConfig): Promise<void> {
        const targetDb = this.resolveDatabaseName(baseConfig);
        if (!targetDb) {
            this.logger.info(chalk.gray('Skipping database existence check (no database specified).'));
            return;
        }

        if (targetDb === KpgDatabaseBootstrapper.ADMIN_DB) {
            this.logger.info(chalk.gray('Target database is postgres; skipping creation.'));
            return;
        }

        const adminConfig = this.buildAdminConfig(baseConfig);
        if (!adminConfig) {
            this.logger.warn(`Unable to derive admin connection when ensuring database ${targetDb}`);
            return;
        }

        this.logger.info(chalk.gray(`Ensuring database ${chalk.yellow(targetDb)} exists...`));

        const adminPool = new Pool(adminConfig);

        try {
            const exists = await this.databaseExists(adminPool, targetDb);
            if (exists) {
                this.logger.info(chalk.gray(`Database ${chalk.yellow(targetDb)} already exists.`));
                return;
            }

            await this.createDatabase(adminPool, targetDb);
            this.logger.info(chalk.green(`Created database ${chalk.bold(targetDb)}.`));
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to ensure database ${targetDb}: ${err.message}`);
            throw err;
        } finally {
            await adminPool.end();
        }
    }

    private buildAdminConfig(baseConfig: PoolConfig): PoolConfig | null {
        const adminConfig: PoolConfig = { ...baseConfig };

        const { connectionString } = adminConfig;
        if (connectionString) {
            const connection = KpgDatabaseBootstrapper.applyDatabaseToConnectionString(
                connectionString,
                KpgDatabaseBootstrapper.ADMIN_DB
            );
            if (!connection) return null;
            adminConfig.connectionString = connection;
        }

        adminConfig.database = KpgDatabaseBootstrapper.ADMIN_DB;
        return adminConfig;
    }

    private async databaseExists(pool: Pool, database: string): Promise<boolean> {
        const client = await pool.connect();
        try {
            const { rows } = await client.query<{ exists: boolean }>(KpgDatabaseBootstrapper.DATABASE_EXISTS_SQL, [
                database
            ]);
            return Boolean(rows[0]?.exists);
        } finally {
            client.release();
        }
    }

    private async createDatabase(pool: Pool, database: string): Promise<void> {
        const client = await pool.connect();
        try {
            const createSql = `CREATE DATABASE ${KpgDatabaseBootstrapper.escapeIdentifier(database)}`;
            await client.query(createSql);
        } finally {
            client.release();
        }
    }

    private static parseDatabaseName(config: PoolConfig): string | null {
        if (typeof config.database === 'string' && config.database.trim().length > 0) {
            return config.database.trim();
        }

        const connectionString = config.connectionString;
        if (!connectionString) return null;

        try {
            const url = new URL(connectionString);
            const pathname = url.pathname.replace(/^\//, '');
            if (!pathname) return null;
            const [candidate] = pathname.split('/');
            return candidate ? decodeURIComponent(candidate) : null;
        } catch {
            return null;
        }
    }

    private static applyDatabaseToConnectionString(connectionString: string, database: string): string | null {
        try {
            const url = new URL(connectionString);
            url.pathname = `/${encodeURIComponent(database)}`;
            return url.toString();
        } catch {
            return null;
        }
    }

    private static escapeIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    }
}
