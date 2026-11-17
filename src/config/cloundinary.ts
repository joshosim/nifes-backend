const cloudinary = require('cloudinary').v2;
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const verficationStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nifes-unity-flow/verification',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    resource_type: 'auto', //for pdf
  } as any
});

const profilePicsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nifes-unity-flow/profile-pics',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'fill' }],
  } as any
});

const teachingMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nifes-unity-flow/teaching-media',
    resource_type: 'auto',
    allowed_formats: ['mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'aac'],
  } as any,
});

const uploadVerification = multer({ storage: verficationStorage });
const uploadProfilePics = multer({ storage: profilePicsStorage });
const uploadTeachingMedia = multer({ storage: teachingMediaStorage });

export {
  uploadVerification,
  uploadProfilePics,
  uploadTeachingMedia,
};
