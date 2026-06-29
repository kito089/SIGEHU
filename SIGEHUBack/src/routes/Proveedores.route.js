import Router from 'express';
import ctrl from '../controllers/Proveedores.controller.js';

const router = Router();

router.get('/', ctrl.findProveedores);

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/:idP/:idM', ctrl.asignMaterial);
router.put('/:idP/idM', ctrl.updateMaterial);
router.delete('/:idP/:idM', ctrl.deleteMaterial)

export default router;