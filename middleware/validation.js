// middleware/validation.js
const { body, validationResult } = require('express-validator');

exports.registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  
  body('age')
    .isInt({ min: 18, max: 100 })
    .withMessage('You must be 18-100 years old'),
  
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Invalid gender selection'),
  
  body('lookingFor')
    .isIn(['Male', 'Female', 'Both'])
    .withMessage('Invalid preference selection')
];

exports.loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(err => err.msg));
    return res.redirect('back');
  }
  next();
};
