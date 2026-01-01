const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://gilhooleyp:X0KZuU7QqWHYxNTW@cluster0.b41mpyd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User schema (simplified)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function disableMfaForUser(email) {
  await connectDB();
  
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }
    
    console.log('Current user MFA settings:', {
      email: user.email,
      twoFactorAuth: user.twoFactorAuth,
      pendingMfaVerification: user.pendingMfaVerification
    });
    
    // Disable MFA completely
    const result = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          'pendingMfaVerification': false
        },
        $unset: {
          'twoFactorAuth': ""
        }
      },
      { new: true }
    );
    
    console.log('MFA disabled for user:', email);
    console.log('Updated user:', {
      email: result.email,
      twoFactorAuth: result.twoFactorAuth,
      pendingMfaVerification: result.pendingMfaVerification
    });
    
  } catch (error) {
    console.error('Error disabling MFA:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node disable-mfa.js <email>');
  console.log('Example: node disable-mfa.js user@example.com');
  process.exit(1);
}

disableMfaForUser(email);