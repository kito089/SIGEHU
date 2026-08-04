import { Router } from 'express';
import ctrl from '../controllers/Auth.controller.js';

const router = Router();

router.post('/refresh', ctrl.refresh);

export default router;
