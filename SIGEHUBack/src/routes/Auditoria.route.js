import { Router } from 'express';
import ctrl from '../controllers/Auditoria.controller.js';
import auth from '../middlewares/auth.middleware.js';

const router = Router();

router.use(auth.verifyToken);
router.use(auth.requireRole('Propietario'));
router.get('/cliente/:idCliente', ctrl.getByCliente);
router.get('/actividad', ctrl.getActividad);
router.get('/historial', ctrl.getHistorial);
router.get('/:idAuditoria/detalles', ctrl.getDetalles);

export default router;
