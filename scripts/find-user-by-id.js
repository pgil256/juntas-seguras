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

async function findUserById(userId) {
  await connectDB();
  
  try {
    console.log(`Looking for user ID: ${userId}`);
    
    // Try to find by _id (MongoDB ObjectId)
    let user = await User.findById(userId);
    if (user) {
      console.log('Found by MongoDB _id:', {
        _id: user._id,
        id: user.id,
        email: user.email,
        name: user.name,
        twoFactorAuth: user.twoFactorAuth
      });
      return;
    }
    
    // Try to find by custom id field
    user = await User.findOne({ id: userId });
    if (user) {
      console.log('Found by custom id field:', {
        _id: user._id,
        id: user.id,
        email: user.email,
        name: user.name,
        twoFactorAuth: user.twoFactorAuth
      });
      return;
    }
    
    console.log('User not found with either _id or id field');
    
    // Show all users to help debug
    const allUsers = await User.find({}, { _id: 1, id: 1, email: 1 });
    console.log('\nAll users in database:');
    allUsers.forEach((u, index) => {
      console.log(`${index + 1}. _id: ${u._id}, id: ${u.id || 'N/A'}, email: ${u.email}`);
    });
    
  } catch (error) {
    console.error('Error finding user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node find-user-by-id.js <userId>');
  console.log('Example: node find-user-by-id.js 67f5bd9f3b77326297fc1e01');
  process.exit(1);
}

findUserById(userId);