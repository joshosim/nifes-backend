import { Router } from 'express';
import {
  getOneUser,
  getUsers,
  updateProfile,
  markAttendance
} from '../controllers/user.controller';
import { uploadProfilePics } from '../config/cloundinary';

const router = Router();

router.get('/users', getUsers);
router.get('/users/:id', getOneUser);
router.patch('/update-profile/:id', uploadProfilePics.single('avatar'), updateProfile);
router.post('/mark-attendance', markAttendance)

export default router;
