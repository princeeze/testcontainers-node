import { AbstractStartedContainer, GenericContainer, type StartedTestContainer } from "testcontainers";
/** Local Oracle Database Free Lite image. Docker must already have this digest. */
export declare const ORACLE_LITE_IMAGE = "container-registry.oracle.com/database/free@sha256:cf540c3fa190d7cffad08c491652ac07fc70314e510f6b87890449517d565e94";
/**
 * Testcontainers wrapper for Oracle Database Free Lite.
 *
 * The lite image only honors ORACLE_PWD (SYS, SYSTEM, and PDBADMIN). The application
 * user is created in FREEPDB1 after the database reports that it is ready.
 */
export declare class OracleDbContainer extends GenericContainer {
    private username;
    private password;
    private database?;
    constructor(image?: string);
    /** Sets the application username created after the database is ready. */
    withUsername(username: string): this;
    /** Sets the password for SYS, SYSTEM, PDBADMIN, and the application user. */
    withPassword(password: string): this;
    /**
     * Accepts only FREEPDB1. The lite image does not create additional pluggable databases.
     * FREEPDB1 is a no-op, matching the Oracle Free module.
     */
    withDatabase(database: string): this;
    /** Starts the container and returns a typed started container instance. */
    start(): Promise<StartedOracleDbContainer>;
}
/** Represents a running Oracle Free Lite test container with Oracle-specific accessors. */
export declare class StartedOracleDbContainer extends AbstractStartedContainer {
    private readonly username;
    private readonly password;
    private readonly database;
    constructor(startedTestContainer: StartedTestContainer, username: string, password: string, database: string);
    /** Returns the mapped Oracle listener port. */
    getPort(): number;
    /** Returns the configured application username. */
    getUsername(): string;
    /** Returns the configured password. */
    getPassword(): string;
    /** Returns the configured service/database name. */
    getDatabase(): string;
    /** Returns a host:port/database URL fragment. */
    getUrl(): string;
    /** Returns an Oracle connection descriptor string (TNS format). */
    getConnectionDescriptor(): string;
}
