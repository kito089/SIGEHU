import { Router } from 'express';
import ctrl from '../controllers/Auditoria.controller.js';
import auth from '../middlewares/auth.middleware.js';

const router = Router();

router.use(auth.verifyToken);
router.get('/cliente/:idCliente', ctrl.getByCliente);

export default router;
