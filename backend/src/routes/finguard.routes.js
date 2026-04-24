import express from "express";
import {
  predictFraud,
  getFraudPredictions,
  getFraudCases
} from "../controllers/finguard.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/predict", protect, predictFraud);
router.get("/predictions", protect, getFraudPredictions);
router.get("/cases", protect, getFraudCases);

export default router;