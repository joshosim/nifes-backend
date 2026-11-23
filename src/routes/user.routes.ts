import { Router } from 'express';
import {
  getOneUser,
  getUsers,
  getMentors,
  getOneMentor,
  updateProfile,
} from '../controllers/user.controller';
import { uploadProfilePics } from '../config/cloundinary';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getUsers);
router.get('/mentors', getMentors);
router.get('/mentors/:id', getOneMentor);
router.get('/:id', authMiddleware, getOneUser);
router.patch('/:id/update-profile', authMiddleware, uploadProfilePics.single('avatar'), updateProfile);

export default router;
