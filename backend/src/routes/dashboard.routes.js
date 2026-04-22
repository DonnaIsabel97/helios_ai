import express from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDashboardSummary);

export default router;