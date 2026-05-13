"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProfilePics = exports.uploadVerification = void 0;
const cloudinary = require('cloudinary').v2;
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
require('dotenv').config();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const verficationStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'nifes-unity-flow/verification',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
        resource_type: 'auto', //for pdfs
    }
});
const profilePicsStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'nifes-unity-flow/profile-pics',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 500, height: 500, crop: 'fill' }],
    }
});
const uploadVerification = (0, multer_1.default)({ storage: verficationStorage });
exports.uploadVerification = uploadVerification;
const uploadProfilePics = (0, multer_1.default)({ storage: profilePicsStorage });
exports.uploadProfilePics = uploadProfilePics;
