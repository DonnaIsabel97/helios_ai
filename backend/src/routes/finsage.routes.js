import express from "express";
import { predictCreditRisk } from "../controllers/finsage.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/predict", protect, predictCreditRisk);

export default router;