import { Router } from 'express';
import {
  getOneUser,
  getUsers,
  updateProfile
} from '../controllers/user.controller';
import { uploadProfilePics } from '../config/cloundinary';

const router = Router();

router.get('/users', getUsers);
router.get('/users/:id', getOneUser);
router.patch('/update-profile/:id', uploadProfilePics.single('avatar'), updateProfile);

export default router;
