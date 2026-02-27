// Register POST - BULLETPROOF AGE VALIDATION
app.post('/register', async (req, res) => {
  try {
    console.log('🔍 REGISTRATION ATTEMPT');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { username, email, password, age, gender, lookingFor, location, terms } = req.body;
    
    // 🔧 FIX 1: Clean and parse age multiple ways
    let ageValue = age;
    
    // Remove any non-numeric characters except decimal
    if (typeof ageValue === 'string') {
      ageValue = ageValue.replace(/[^0-9]/g, '');
    }
    
    // Convert to number
    const ageNumber = Number(ageValue);
    
    console.log('🔍 Age Debug:');
    console.log('  - Raw:', age);
    console.log('  - Cleaned:', ageValue);
    console.log('  - Type:', typeof age);
    console.log('  - Parsed:', ageNumber);
    console.log('  - Is NaN:', isNaN(ageNumber));
    console.log('  - Is >= 18:', ageNumber >= 18);
    
    // 🔧 FIX 2: Comprehensive validation
    const errors = [];
    
    if (!username || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push('Please enter a valid email');
    }
    
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    // 🔧 FIX 3: Age validation - be very explicit
    if (!age && age !== 0 && age !== '0') {
      errors.push('Age is required');
    } else if (isNaN(ageNumber)) {
      errors.push('Age must be a number');
    } else if (ageNumber < 18) {
      errors.push('You must be 18 or older (you entered: ' + ageNumber + ')');
    } else if (ageNumber > 100) {
      errors.push('Age must be 100 or less');
    }
    
    if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
      errors.push('Please select a valid gender');
    }
    
    if (!lookingFor || !['Male', 'Female', 'Both'].includes(lookingFor)) {
      errors.push('Please select what you are looking for');
    }
    
    if (!terms) {
      errors.push('You must agree to the Terms of Service');
    }
    
    // If any errors, show them
    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      req.flash('error', errors);
      return res.redirect('/register');
    }
    
    const User = require('./models/User');
    
    // Check for existing user
    const existing = await User.findOne({ 
      $or: [{ username: new RegExp('^' + username.trim() + '$', 'i') }, 
            { email: email.toLowerCase() }] 
    });
    
    if (existing) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }
    
    // 🔧 FIX 4: Create user with explicit age as Number
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase(),
      password: password,
      age: ageNumber,  // Explicitly a Number
      gender: gender,
      lookingFor: lookingFor,
      location: location || 'Ethiopia',
      isActive: true,
      isVerified: false
    });
    
    console.log('✅ Creating user:', user.username, 'Age:', user.age, 'Type:', typeof user.age);
    
    await user.save();
    
    console.log('✅ User created successfully! ID:', user._id);
    
    req.flash('success', 'Account created! Please login.');
    res.redirect('/login');
    
  } catch (error) {
    console.error('❌ Register error:', error.message);
    console.error('Error stack:', error.stack);
    
    let errorMsg = 'Registration failed. Please try again.';
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      errorMsg = Object.values(error.errors).map(e => e.message).join(', ');
    }
    
    req.flash('error', errorMsg);
    res.redirect('/register');
  }
});
