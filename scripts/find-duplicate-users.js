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

async function findDuplicateUsers() {
  await connectDB();
  
  try {
    // Group users by email to find duplicates
    const duplicates = await User.aggregate([
      {
        $group: {
          _id: "$email",
          count: { $sum: 1 },
          users: { $push: { _id: "$_id", id: "$id", email: "$email", name: "$name" } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    if (duplicates.length === 0) {
      console.log('No duplicate users found');
    } else {
      console.log('Found duplicate users:');
      duplicates.forEach((group, index) => {
        console.log(`\n${index + 1}. Email: ${group._id} (${group.count} duplicates)`);
        group.users.forEach((user, userIndex) => {
          console.log(`   ${userIndex + 1}. _id: ${user._id}, id: ${user.id || 'N/A'}, name: ${user.name || 'N/A'}`);
        });
      });
    }
    
    // Also show all users for reference
    console.log('\nAll users in database:');
    const allUsers = await User.find({}, { _id: 1, id: 1, email: 1, name: 1 }).sort({ email: 1 });
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. _id: ${user._id}, id: ${user.id || 'N/A'}, email: ${user.email}, name: ${user.name || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error finding duplicates:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

findDuplicateUsers();