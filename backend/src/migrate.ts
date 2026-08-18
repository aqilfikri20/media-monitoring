import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "./connect_db";

const migrationPath = path.join(
    process.cwd(),
    "migrations",
    "001_create_tables.sql"
);

async function migrate() {
    try{
        const sql = await fs.readFile(migrationPath, "utf-8");
        await pool.query(sql)

        console.log("Migration Sukses");
    } catch (error) {
        console.log("migration gagal", error);
        process.exit(1);
    }finally {
        await pool.end();
    }
}

migrate();