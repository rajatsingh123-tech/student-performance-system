const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

async function deleteAllUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('\n✅ Connected to MongoDB\n');
        
        const result = await User.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} users\n`);
        
        await mongoose.disconnect();
        console.log('✅ Database is now empty. You can register new users!\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteAllUsers();