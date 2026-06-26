import Router from 'express';
import ctrl from '../controllers/Trabajadores.controller.js';

const router = Router();

router.get('/', ctrl.findTrabajadores);
router.get('/TiposUsuarios', ctrl.findTiposUsuarios)
router.get('/:id', ctrl.findById);

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;