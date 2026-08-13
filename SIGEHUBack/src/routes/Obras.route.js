import { Router } from "express";
import controller from "../controllers/Obras.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

// rutas => /Obras/
router.get("/", controller.getAll);
router.get("/estados", controller.getEstados);
// Detalle administrativo (VW_DETALLE_OBRA incluye RFC/fiscales): SOLO Propietario.
// En la ruta "/detalle/:id" antes de "/:id" para que no la capture el patrón genérico.
router.get("/detalle/:id", auth.requireRole('Propietario'), controller.getDetalle);
// Detalle seguro para las vistas móviles de trabajador (jamás expone RFC/fiscales).
router.get("/movil/:id", controller.getDetalleMovil);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
// Baja de obras y cambios de estado (aceptación de la doble validación): únicamente
// administrativos (RF-33). El trabajador finaliza vía PUT /Obras/:id (completarEtapa)
// y el Propietario acepta/rechaza aquí.
router.delete("/:id", auth.requireRole('Propietario'), controller.remove);
router.patch("/:id/estado", auth.requireRole('Propietario'), controller.cambiarEstado);
// Fechas por etapa del Detalle de Obra (solo Propietario).
router.patch("/:id/fechas-etapas", auth.requireRole('Propietario'), controller.cambiarFechasEtapas);

export default router;