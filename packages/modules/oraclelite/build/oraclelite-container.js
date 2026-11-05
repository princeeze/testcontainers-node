"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedOracleDbContainer = exports.OracleDbContainer = exports.ORACLE_LITE_IMAGE = void 0;
const testcontainers_1 = require("testcontainers");
/** Local Oracle Database Free Lite image. Docker must already have this digest. */
exports.ORACLE_LITE_IMAGE = "container-registry.oracle.com/database/free@sha256:cf540c3fa190d7cffad08c491652ac07fc70314e510f6b87890449517d565e94";
/** Default Oracle listener port. */
const ORACLEDB_PORT = 1521;
/** Only pluggable database shipped in the Oracle Free Lite image. */
const DEFAULT_DATABASE = "FREEPDB1";
/**
 * Testcontainers wrapper for Oracle Database Free Lite.
 *
 * The lite image only honors ORACLE_PWD (SYS, SYSTEM, and PDBADMIN). The application
 * user is created in FREEPDB1 after the database reports that it is ready.
 */
class OracleDbContainer extends testcontainers_1.GenericContainer {
    username = "test";
    password = "test";
    database = undefined;
    constructor(image = exports.ORACLE_LITE_IMAGE) {
        super(image);
        this.withExposedPorts(ORACLEDB_PORT);
        this.withWaitStrategy(testcontainers_1.Wait.forLogMessage("DATABASE IS READY TO USE!"));
        this.withStartupTimeout(600_000);
    }
    /** Sets the application username created after the database is ready. */
    withUsername(username) {
        this.username = username;
        return this;
    }
    /** Sets the password for SYS, SYSTEM, PDBADMIN, and the application user. */
    withPassword(password) {
        this.password = password;
        return this;
    }
    /**
     * Accepts only FREEPDB1. The lite image does not create additional pluggable databases.
     * FREEPDB1 is a no-op, matching the Oracle Free module.
     */
    withDatabase(database) {
        if (database.trim() === "") {
            throw new Error("Database name cannot be empty.");
        }
        if (database.toUpperCase() !== DEFAULT_DATABASE) {
            throw new Error(`Oracle Database Free Lite only provides ${DEFAULT_DATABASE}.`);
        }
        this.database = undefined;
        return this;
    }
    /** Starts the container and returns a typed started container instance. */
    async start() {
        this.withPullPolicy(testcontainers_1.PullPolicy.neverPull());
        this.withEnvironment({ ORACLE_PWD: this.password });
        const started = await super.start();
        try {
            await createApplicationUser(started, this.username, this.password);
        }
        catch (error) {
            await started.stop();
            throw error;
        }
        return new StartedOracleDbContainer(started, this.username, this.password, this.database ?? DEFAULT_DATABASE);
    }
}
exports.OracleDbContainer = OracleDbContainer;
/** Represents a running Oracle Free Lite test container with Oracle-specific accessors. */
class StartedOracleDbContainer extends testcontainers_1.AbstractStartedContainer {
    username;
    password;
    database;
    constructor(startedTestContainer, username, password, database) {
        super(startedTestContainer);
        this.username = username;
        this.password = password;
        this.database = database;
    }
    /** Returns the mapped Oracle listener port. */
    getPort() {
        return this.getMappedPort(ORACLEDB_PORT);
    }
    /** Returns the configured application username. */
    getUsername() {
        return this.username;
    }
    /** Returns the configured password. */
    getPassword() {
        return this.password;
    }
    /** Returns the configured service/database name. */
    getDatabase() {
        return this.database;
    }
    /** Returns a host:port/database URL fragment. */
    getUrl() {
        return `${this.getHost()}:${this.getPort()}/${this.database}`;
    }
    /** Returns an Oracle connection descriptor string (TNS format). */
    getConnectionDescriptor() {
        return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${this.getHost()})(PORT=${this.getPort()}))(CONNECT_DATA=(SERVICE_NAME=${this.database})))`;
    }
}
exports.StartedOracleDbContainer = StartedOracleDbContainer;
async function createApplicationUser(container, username, password) {
    const oracleUser = username.toUpperCase();
    const quotedPassword = password.replaceAll('"', '""');
    const sql = [
        "WHENEVER SQLERROR EXIT SQL.SQLCODE",
        "ALTER SESSION SET CONTAINER=FREEPDB1;",
        "ALTER PROFILE DEFAULT LIMIT PASSWORD_VERIFY_FUNCTION NULL;",
        // Lite image has no USERS tablespace; the quota statement below requires one.
        "CREATE TABLESPACE USERS DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/users01.dbf' SIZE 10M AUTOEXTEND ON;",
        `CREATE USER ${oracleUser} IDENTIFIED BY "${quotedPassword}";`,
        `GRANT DB_DEVELOPER_ROLE TO ${oracleUser};`,
        `ALTER USER ${oracleUser} QUOTA UNLIMITED ON USERS;`,
        "EXIT",
    ].join("\n");
    const result = await container.exec(["bash", "-c", `sqlplus -s / as sysdba <<'SQL'\n${sql}\nSQL`]);
    if (result.exitCode !== 0) {
        throw new Error(`Failed to create Oracle application user (exit ${result.exitCode}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    }
}
