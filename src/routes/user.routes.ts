import { Router } from 'express';
import {
  getOneUser,
  getUsers
} from '../controllers/user.controller';

const router = Router();

router.get('/users', getUsers);
router.get('/users/:id', getOneUser);

export default router;