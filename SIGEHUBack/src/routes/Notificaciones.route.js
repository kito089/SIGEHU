import { Router } from "express";
import controller from "../controllers/Notificaciones.controller.js";

const router = Router();

router.get("/", controller.list);
router.get("/stream", controller.stream);
router.post("/", controller.create);
router.delete("/", controller.removeAll);
router.delete("/:id", controller.remove);

export default router;