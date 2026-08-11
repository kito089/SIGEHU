import { Router } from "express";
import controller from "../controllers/Compras.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

router.use(auth.verifyToken);

// GET / y PUT /:id están abiertos a autenticados: el controller ramifica por rol.
// - Trabajador (chofer): lista solo sus compras sin datos financieros y puede
//   marcarlas como surtidas (PUT con { estado: 'Surtida' }).
// - Propietario: CRUD completo (CRUD Compras).
router.get("/", controller.getAll);
router.get("/pendientes", auth.requireRole('Propietario'), controller.getPendientes);
router.get("/:id", auth.requireRole('Propietario'), controller.getById);
router.post("/", auth.requireRole('Propietario'), controller.create);
router.put("/:id", controller.update);
router.delete("/:id", auth.requireRole('Propietario'), controller.remove);
router.get("/chofer/:id", controller.getChofer);
router.patch("/:id/recibido", controller.marcarRecibida);

export default router;