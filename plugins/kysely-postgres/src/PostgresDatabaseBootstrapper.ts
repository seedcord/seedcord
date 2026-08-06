import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import chalk from 'chalk';
import { Pool, type PoolClient, type PoolConfig } from 'pg';

import type { Logger } from '@seedcord/logger';

function disposableClient(client: PoolClient): PoolClient & Disposable {
    return Object.assign(client, { [Symbol.dispose]: () => client.release() });
}

function disposablePool(pool: Pool): Pool & AsyncDisposable {
    return Object.assign(pool, { [Symbol.asyncDispose]: () => pool.end() });
}

const DUPLICATE_DATABASE = '42P04'; // postgres duplicate_database

function isDuplicateDatabase(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_DATABASE;
}

/**
 * Ensures the target Postgres database exists, creating it if missing.
 */
export class PostgresDatabaseBootstrapper {
    private static readonly ADMIN_DB = 'postgres';
    private static readonly DATABASE_EXISTS_SQL =
        'SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"';

    constructor(private readonly logger: Logger) {}

    public resolveDatabaseName(config: PoolConfig): string | null {
        return PostgresDatabaseBootstrapper.parseDatabaseName(config);
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
            this.logger.debug(chalk.gray('Skipping database existence check (no database specified).'));
            return;
        }

        if (targetDb === PostgresDatabaseBootstrapper.ADMIN_DB) {
            this.logger.debug(chalk.gray('Target database is postgres, so skipping creation.'));
            return;
        }

        const adminConfig = this.buildAdminConfig(baseConfig);
        if (!adminConfig) {
            this.logger.warn(`Unable to derive admin connection when ensuring database ${targetDb}`);
            return;
        }

        this.logger.debug(chalk.gray(`Ensuring database ${chalk.yellow(targetDb)} exists...`));

        await using adminPool = disposablePool(new Pool(adminConfig));

        try {
            const exists = await this.databaseExists(adminPool, targetDb);
            if (exists) {
                this.logger.debug(chalk.gray(`Database ${chalk.yellow(targetDb)} already exists.`));
                return;
            }

            await this.createDatabase(adminPool, targetDb);
        } catch (error) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyBootstrapFailed, [targetDb], { cause: error });
        }
    }

    private buildAdminConfig(baseConfig: PoolConfig): PoolConfig | null {
        const adminConfig: PoolConfig = { ...baseConfig };

        const { connectionString } = adminConfig;
        if (connectionString) {
            const connection = PostgresDatabaseBootstrapper.applyDatabaseToConnectionString(
                connectionString,
                PostgresDatabaseBootstrapper.ADMIN_DB
            );
            if (!connection) return null;
            adminConfig.connectionString = connection;
        }

        adminConfig.database = PostgresDatabaseBootstrapper.ADMIN_DB;
        return adminConfig;
    }

    private async databaseExists(pool: Pool, database: string): Promise<boolean> {
        using client = disposableClient(await pool.connect());
        const { rows } = await client.query<{ exists: boolean }>(PostgresDatabaseBootstrapper.DATABASE_EXISTS_SQL, [
            database
        ]);
        return Boolean(rows[0]?.exists);
    }

    private async createDatabase(pool: Pool, database: string): Promise<void> {
        using client = disposableClient(await pool.connect());
        const createSql = `CREATE DATABASE ${PostgresDatabaseBootstrapper.escapeIdentifier(database)}`;

        try {
            await client.query(createSql);
            this.logger.info(chalk.green(`Created database ${chalk.bold(database)}.`));
        } catch (error) {
            // another process created it first, and the database exists either way
            if (!isDuplicateDatabase(error)) throw error;
            this.logger.debug(chalk.gray(`Database ${chalk.yellow(database)} was created concurrently.`));
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
        return `"${identifier.replaceAll('"', '""')}"`;
    }
}
