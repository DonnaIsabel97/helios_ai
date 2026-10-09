import { getCreditDetails, updateCreditCase } from "../controllers/creditReview.controller.js";
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
router.get("/predictions/:id", protect, getCreditDetails);
router.patch("/predictions/:id/case", protect, updateCreditCase);
router.get("/cases", protect, getCreditCases);

export default router;