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

async function listUsers() {
  await connectDB();
  
  try {
    const users = await User.find({}, { email: 1, name: 1, twoFactorAuth: 1, pendingMfaVerification: 1 }).limit(10);
    
    console.log('Users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email || 'N/A'}, Name: ${user.name || 'N/A'}`);
      console.log(`   MFA: ${JSON.stringify(user.twoFactorAuth || 'Not set')}`);
      console.log(`   Pending: ${user.pendingMfaVerification || false}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

listUsers();