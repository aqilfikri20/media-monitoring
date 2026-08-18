import express from "express";
import { pool } from "./connect_db";
import mentionsRouter from "./routes/mentions";
import cors from "cors";


const app = express();
app.use(cors());
app.use(express.json());
app.use(mentionsRouter);
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