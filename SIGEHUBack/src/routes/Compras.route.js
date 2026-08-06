import { Router } from "express";
import controller from "../controllers/Compras.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

router.use(auth.verifyToken);

router.get("/", auth.requireRole('Propietario'), controller.getAll);
router.get("/:id", auth.requireRole('Propietario'), controller.getById);
router.post("/", auth.requireRole('Propietario'), controller.create);
router.put("/:id", auth.requireRole('Propietario'), controller.update);
router.delete("/:id", auth.requireRole('Propietario'), controller.remove);
router.get("/chofer/:id", controller.getChofer);
router.patch("/:id/recibido", controller.marcarRecibida);

export default router;