import express from "express";
import { pool } from "./connect_db";


const app = express();

app.use(express.json());
app.get("/", async (_req, res) => {
    const result = await pool.query("SELECT NOW()");

    res.json({
        message: "Halo Semua. API Jalan Nih",
        database_time: result.rows[0].now,
    })
})

app.listen(3000, () => {
    console.log("server running on port 3000")
})