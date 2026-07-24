import { Router } from "express";
import controller from "../controllers/ClientesContactos.controller.js";

const router = Router();

// ruta => /Clientes/
router.post("/:idCliente/contactos", controller.create);
router.get("/:idCliente/contactos", controller.getByCliente);
router.put("/contactos/:id", controller.update);
router.delete("/contactos/:id", controller.remove);

export default router;