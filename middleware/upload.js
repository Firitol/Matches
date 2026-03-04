// middleware/upload.js
const multer = require('multer');
const { uploadToCloudinary } = require('../lib/cloudinary');

// Memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: fileFilter
});

// Middleware to upload to Cloudinary
const uploadToCloudinaryMiddleware = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }
    
    console.log('📤 Uploading file:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    const folder = req.body.uploadType === 'profile' ? 'ethiomatch/profiles' : 'ethiomatch/messages';
    const result = await uploadToCloudinary(req.file.buffer, folder);
    
    console.log('✅ Upload successful:', result.secure_url);
    
    req.cloudinaryResult = {
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: result.resource_type === 'video' ? 'video' : 'image'
    };
    
    next();
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload file: ' + error.message 
    });
  }
};

module.exports = {
  upload,
  uploadToCloudinaryMiddleware
};
