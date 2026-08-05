import Router from 'express';
import ctrl from '../controllers/Trabajadores.controller.js';
import { uploadDocumentoImss } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/', ctrl.findTrabajadores);
router.get('/TiposUsuarios', ctrl.findTiposUsuarios)
router.get('/check-username', ctrl.checkUsername)
router.get('/:id/obras', ctrl.findObras)
router.get('/:id', ctrl.findById);

router.post('/', ctrl.create);
router.post('/:id/imss', uploadDocumentoImss.single('imss'), ctrl.uploadImss);
router.post('/login', ctrl.login);
router.put('/:id', ctrl.update);
router.patch('/:id/activo', ctrl.cambiarActivo);
router.delete('/:id', ctrl.remove);

export default router;
