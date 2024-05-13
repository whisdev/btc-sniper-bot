import express from "express";
import { etchController, imgEtchController } from "../controller/etchController";

const router = express.Router();

router.use((req, res, next) => {
    // console.log(`req.metthod ==========> ${req.method} ${req.originalUrl}`);
    next();
});

router.post("/run-etching", (req, res, next) => {
    const data = etchController();
    // console.log("etching router ==> ", data);
    return res.json({ success: true });
})

router.post("/img-etching", async (req, res, next) => {
    try {
        await imgEtchController(req, res);
    } catch (error) {
        next(error);
    }
})

export default router;