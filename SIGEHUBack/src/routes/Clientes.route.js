import Router from 'express';
import ctrl from '../controllers/Clientes.controller.js';

const router = Router();

router.get('/', ctrl.findClientes);
router.get('/RegimenesFiscales', ctrl.findRegimenesFiscales)
router.get('/UsosCFDI', ctrl.findUsosCFDI)
router.get('/:id', ctrl.findById);

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;