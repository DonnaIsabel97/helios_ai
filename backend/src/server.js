import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import pool from "./db/connection.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import finguardRoutes from "./routes/finguard.routes.js";
import finsageRoutes from "./routes/finsage.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://helios-ai-six.vercel.app/"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Helios API running",
  });
});

app.get("/api/health", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json({
      message: "API healthy",
      database: "connected",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    next(error);
  }
}); 

// Routes
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/finguard", finguardRoutes);
app.use("/api/finsage", finsageRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});