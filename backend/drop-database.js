const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function dropDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('\n✅ Connected to MongoDB\n');
        
        // Drop the entire database
        await mongoose.connection.db.dropDatabase();
        console.log('✅ Database dropped successfully!\n');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 DATABASE IS NOW COMPLETELY EMPTY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

dropDatabase();