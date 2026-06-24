const Router = require('express');
const ctrl = require('../controllers/Clientes.controller.js');

const router = Router();

// Rutas estáticas primero
router.get('/structure', ctrl.getStructure);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;