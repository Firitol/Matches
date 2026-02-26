// middleware/validation.js
const { body, validationResult } = require('express-validator');

exports.registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('age').isInt({ min: 18, max: 100 }).withMessage('You must be 18-100 years old'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('lookingFor').isIn(['Male', 'Female', 'Both']).withMessage('Invalid preference')
];

exports.loginValidation = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(err => err.msg));
    return res.redirect('back');
  }
  next();
};
