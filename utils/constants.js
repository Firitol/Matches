// utils/constants.js

module.exports = {
  // App Info
  APP_NAME: 'EthioMatch',
  APP_VERSION: '2.0.0',
  APP_TAGLINE: 'Find serious relationships with Ethiopians worldwide',
  
  // Age Restrictions
  MIN_AGE: 18,
  MAX_AGE: 100,
  
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  
  // Session
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 1 day
  REMEMBER_ME_MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Password Requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  
  // Username Requirements
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,
  
  // Bio
  BIO_MAX_LENGTH: 500,
  
  // Message
  MESSAGE_MAX_LENGTH: 1000,
  
  // Profile Image
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  AUTH_RATE_LIMIT_MAX: 5, // Login attempts
  
  // Match Status
  MATCH_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    BLOCKED: 'blocked'
  },
  
  // Gender Options
  GENDER_OPTIONS: ['Male', 'Female', 'Other'],
  
  // Looking For Options
  LOOKING_FOR_OPTIONS: ['Male', 'Female', 'Both'],
  
  // Report Reasons
  REPORT_REASONS: [
    'Fake profile',
    'Inappropriate content',
    'Harassment',
    'Spam',
    'Underage',
    'Other'
  ],
  
  // Locations (Ethiopian cities)
  ETHIOPIAN_CITIES: [
    'Addis Ababa',
    'Dire Dawa',
    'Mekelle',
    'Gondar',
    'Bahir Dar',
    'Hawassa',
    'Dessie',
    'Jimma',
    'Jijiga',
    'Shashamane',
    'Bishoftu',
    'Arba Minch',
    'Harar',
    'Dilla',
    'Nekemte',
    'Debre Birhan',
    'Asella',
    'Debre Markos',
    'Kombolcha',
    'Debre Tabor'
  ],
  
  // Common Interests
  COMMON_INTERESTS: [
    'Music',
    'Travel',
    'Sports',
    'Reading',
    'Cooking',
    'Movies',
    'Fitness',
    'Art',
    'Photography',
    'Gaming',
    'Dancing',
    'Hiking',
    'Volunteering',
    'Business',
    'Education',
    'Faith',
    'Family',
    'Culture'
  ],
  
  // Email Templates
  EMAIL_FROM: 'noreply@ethiomatch.com',
  EMAIL_SUPPORT: 'support@ethiomatch.com',
  
  // Social Media
  SOCIAL_LINKS: {
    facebook: 'https://facebook.com/ethiomatch',
    twitter: 'https://twitter.com/ethiomatch',
    instagram: 'https://instagram.com/ethiomatch',
    telegram: 'https://t.me/ethiomatch'
  },
  
  // API Response Messages
  MESSAGES: {
    SUCCESS: 'Operation successful',
    ERROR: 'An error occurred',
    UNAUTHORIZED: 'Unauthorized access',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation failed',
    RATE_LIMITED: 'Too many requests, please try again later'
  }
};
