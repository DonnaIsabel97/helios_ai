import express from "express";
import {
  predictCreditRisk,
  getCreditPredictions,
  getCreditCases
} from "../controllers/finsage.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/predict", protect, predictCreditRisk);
router.get("/predictions", protect, getCreditPredictions);
router.get("/cases", protect, getCreditCases);

export default router;