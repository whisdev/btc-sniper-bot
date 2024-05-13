import express from "express";
import axios from "axios";

import { OPENAPI_UNISAT_URL } from "../config/config";
import { getRuneId } from "../utils/getRuneId";

const router = express.Router();

router.use((req, res, next) => {
    // console.log(`req.metthod ==========> ${req.method} ${req.originalUrl}`);
    next();
});

router.post("/getRuneId", async (req, res, next) => {
    try {
        const runeId = await getRuneId(req.body);
        console.log("runeID ====>", runeId);

        res.json({ data: runeId });
    } catch (error) {
        next(error);
    }
})

export default router;