import express from "express";
import {sendEmail} from "../controllers/contact_us.js";

const router = express.Router();

router.post("/contactForm", sendEmail);

export default router;