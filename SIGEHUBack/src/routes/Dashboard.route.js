import { Router } from "express";
import controller from "../controllers/Dashboard.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

router.use(auth.verifyToken);
router.use(auth.requireRole('Propietario'));

router.get("/indicadores", controller.getIndicadores);
router.get("/kanban", controller.getKanban);
router.get("/activity", controller.getActivityFeed);
router.get("/calendar-events", controller.getCalendarEvents);

export default router;