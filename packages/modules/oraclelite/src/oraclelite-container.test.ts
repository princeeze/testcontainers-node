import "./disable-ryuk";

import oracledb from "oracledb";
import { ORACLE_LITE_IMAGE, OracleDbContainer, type StartedOracleDbContainer } from "./oraclelite-container";

process.env.TESTCONTAINERS_RYUK_DISABLED = "true";

describe("OracleLiteContainer", { concurrent: false, timeout: 600_000 }, () => {
  describe("default configuration", () => {
    let container: StartedOracleDbContainer;

    // start one container for all tests in this block to save on resources
    beforeAll(async () => {
      process.env.TESTCONTAINERS_RYUK_DISABLED = "true";
      container = await new OracleDbContainer(ORACLE_LITE_IMAGE).start();
    }, 600_000);

    afterAll(async () => {
      await container?.stop();
    });

    it("should connect and return a query result", async () => {
      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getUrl(),
      });

      const result = await connection.execute("SELECT 1 FROM DUAL");
      expect(result.rows?.[0]).toEqual([1]);

      await connection.close();
    });

    it("should work with connection descriptor", async () => {
      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getConnectionDescriptor(),
      });

      const result = await connection.execute("SELECT 1 FROM DUAL");
      expect(result.rows?.[0]).toEqual([1]);

      await connection.close();
    });

    it("should have default database name", async () => {
      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getUrl(),
      });

      const result = await connection.execute("SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM DUAL");
      expect(result.rows?.[0]).toEqual(["FREEPDB1"]);

      await connection.close();
    });
  });

  it("should treat default database names as no-op and reject empty names", () => {
    const container = new OracleDbContainer(ORACLE_LITE_IMAGE);
    expect(() => container.withDatabase("FREEPDB1")).not.toThrow();
    expect(() => container.withDatabase("freepdb1")).not.toThrow();
    expect(() => container.withDatabase("")).toThrow("Database name cannot be empty.");
    expect(() => container.withDatabase("TESTDB")).toThrow(/FREEPDB1/);
  });

  it("should set a custom username and password on FREEPDB1", async () => {
    process.env.TESTCONTAINERS_RYUK_DISABLED = "true";
    const customUsername = "customuser";
    const customPassword = "customPassword";
    await using container = await new OracleDbContainer(ORACLE_LITE_IMAGE)
      .withUsername(customUsername)
      .withPassword(customPassword)
      .start();

    expect(container.getUsername()).toBe(customUsername);
    expect(container.getPassword()).toBe(customPassword);
    expect(container.getDatabase()).toBe("FREEPDB1");

    const connection = await oracledb.getConnection({
      user: container.getUsername(),
      password: container.getPassword(),
      connectString: container.getUrl(),
    });

    const result = await connection.execute("SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM DUAL");
    expect(result.rows?.[0]).toEqual(["FREEPDB1"]);

    const resultUser = await connection.execute("SELECT USER FROM DUAL");
    expect(resultUser.rows?.[0]).toEqual([customUsername.toUpperCase()]);

    await connection.close();
  });

  it("should work with restarted container", async () => {
    process.env.TESTCONTAINERS_RYUK_DISABLED = "true";
    const container = await new OracleDbContainer(ORACLE_LITE_IMAGE).start();

    try {
      await container.restart();

      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getUrl(),
      });

      const result = await connection.execute("SELECT 1 FROM DUAL");
      expect(result.rows?.[0]).toEqual([1]);

      await connection.close();
    } finally {
      await container.stop();
    }
  });
});
