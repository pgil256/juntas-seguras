import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from './connect';
import getUserModel from './models/user';
import getPoolModel from './models/pool';
import { PoolStatus, PoolMemberStatus, PoolMemberRole } from '@/types/pool';

// Function to seed the database with initial data for demo purposes
export async function seedDatabase() {
  console.log('Seeding database...');
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get models
    const UserModel = getUserModel();
    const PoolModel = getPoolModel();
    
    // Check if we already have users and pools
    const userCount = await UserModel.countDocuments();
    const poolCount = await PoolModel.countDocuments();
    
    // If we already have data, don't seed again
    if (userCount > 0 && poolCount > 0) {
      console.log('Database already seeded. Skipping...');
      return;
    }
    
    // Create demo user
    const userId = uuidv4();
    const user = await UserModel.create({
      id: userId,
      name: 'Demo User',
      email: 'demo@example.com',
      createdAt: new Date().toISOString(),
      hashedPassword: 'demo123', // Very insecure! Just for demo
      pools: [],
    });
    
    // Create sample pool
    const poolId = uuidv4();
    const samplePool = {
      id: poolId,
      name: "Family Savings Pool",
      description: "Our shared savings for household expenses and emergencies",
      createdAt: new Date().toISOString(),
      status: PoolStatus.ACTIVE,
      totalAmount: 950,
      contributionAmount: 50,
      frequency: "Weekly",
      currentRound: 4,
      totalRounds: 8,
      nextPayoutDate: getNextPayoutDate(new Date(), "Weekly").toISOString(),
      memberCount: 8,
      members: [
        {
          id: 1,
          name: "You",
          email: "demo@example.com",
          joinDate: new Date().toISOString(),
          role: PoolMemberRole.ADMIN,
          position: 3,
          status: PoolMemberStatus.CURRENT,
          paymentsOnTime: 8,
          paymentsMissed: 0,
          totalContributed: 400,
          payoutReceived: false,
          payoutDate: getNextPayoutDate(new Date(), "Weekly").toISOString(),
          avatar: "",
        },
        // Add more sample members here
      ],
      transactions: [
        {
          id: 1,
          type: "contribution",
          amount: 50,
          date: new Date().toISOString(),
          member: "You",
          status: "completed",
        }
      ],
      messages: [
        {
          id: 1,
          author: "System",
          content: "Welcome to your new savings pool!",
          date: new Date().toISOString(),
        }
      ],
    };
    
    const pool = await PoolModel.create(samplePool);
    
    // Update user's pools array
    user.pools.push(poolId);
    await user.save();
    
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Helper function to calculate next payout date based on frequency
function getNextPayoutDate(startDate: Date, frequency: string): Date {
  const nextDate = new Date(startDate);
  
  switch (frequency.toLowerCase()) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      // Default to weekly
      nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return nextDate;
}