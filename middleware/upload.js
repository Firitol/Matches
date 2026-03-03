// middleware/upload.js
const multer = require('multer');
const { uploadToCloudinary } = require('../lib/cloudinary');

// Memory storage for multer
const storage = multer.memoryStorage();

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, WebM videos are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: fileFilter
});

// Middleware to upload to Cloudinary
const uploadToCloudinaryMiddleware = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }
    
    const folder = req.body.uploadType === 'profile' ? 'ethiomatch/profiles' : 'ethiomatch/messages';
    const result = await uploadToCloudinary(req.file.buffer, folder);
    
    req.cloudinaryResult = {
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: result.resource_type === 'video' ? 'video' : 'image'
    };
    
    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
};

module.exports = {
  upload,
  uploadToCloudinaryMiddleware
};
