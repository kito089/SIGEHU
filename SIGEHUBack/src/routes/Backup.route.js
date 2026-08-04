import { Router } from "express";
import backup from '../jobs/backup.job.js';
import auth from "../middlewares/auth.middleware.js";

const router = Router();

router.use(auth.verifyToken);
router.use(auth.requireRole('Propietario'));

router.get("/status", (_req, res) => {
    try {
        const status = backup.leerStatus();
        res.json(status);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/manual", async (_req, res) => {
    try {
        const resultado = await backup.hacerRespaldoGbak();
        res.json({ message: 'Respaldo manual ejecutado', resultado });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;