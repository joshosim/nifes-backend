import { Router } from 'express';
import {
  getOneUser,
  getUsers,
  getMentors,
  getOneMentor,
  updateProfile,
} from '../controllers/user.controller';
import { uploadProfilePics } from '../config/cloundinary';

const router = Router();

router.get('/', getUsers);
router.get('/mentors', getMentors);
router.get('/mentors/:id', getOneMentor);
router.get('/:id', getOneUser);
router.patch('/:id/update-profile', uploadProfilePics.single('avatar'), updateProfile);

export default router;
