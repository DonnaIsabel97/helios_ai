import express from "express";
import { predictFraud } from "../controllers/finguard.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/predict", protect, predictFraud);

export default router;