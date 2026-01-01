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

async function disableMfaByUserId(userId) {
  await connectDB();
  
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`User with ID ${userId} not found`);
      return;
    }
    
    console.log('Current user MFA settings:', {
      _id: user._id,
      id: user.id,
      email: user.email,
      twoFactorAuth: user.twoFactorAuth,
      pendingMfaVerification: user.pendingMfaVerification
    });
    
    // Disable MFA completely
    const result = await User.findByIdAndUpdate(
      userId,
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
    
    console.log('MFA disabled for user ID:', userId);
    console.log('Updated user:', {
      _id: result._id,
      id: result.id,
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

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node disable-mfa-by-id.js <userId>');
  console.log('Example: node disable-mfa-by-id.js 67f5bd9f3b77326297fc1e01');
  process.exit(1);
}

disableMfaByUserId(userId);