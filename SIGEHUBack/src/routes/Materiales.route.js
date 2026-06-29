import Router from 'express';
import ctrl from '../controllers/Materiales.controller.js';

const router = Router();

router.get('/', ctrl.findMateriales);
router.get('/:id', ctrl.findById);

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;