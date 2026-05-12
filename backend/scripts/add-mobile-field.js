// Migration Script - Add mobile field to existing users
// Run this script to add mobile field to all existing users

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import User model
const User = require('../models/User');

async function addMobileField() {
    console.log('\n🚀 Starting migration: Adding mobile field to users...\n');
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully\n');
        
        // Check if mobile field exists and add it
        console.log('🔍 Checking existing users...');
        
        // First, check if any user already has mobile field
        const sampleUser = await User.findOne({});
        if (sampleUser && sampleUser.mobile === undefined) {
            console.log('⚠️  Mobile field missing. Adding mobile field...');
            
            // Update all users: add mobile field with null value if not exists
            const result = await User.updateMany(
                { mobile: { $exists: false } },  // Only update users without mobile field
                { $set: { mobile: null } }        // Set mobile to null
            );
            
            console.log(`✅ Updated ${result.modifiedCount} users with mobile field`);
            console.log(`📊 Total users checked: ${result.matchedCount}`);
        } else {
            console.log('✅ Mobile field already exists in users');
            
            // Just ensure all users have mobile field
            const result = await User.updateMany(
                { mobile: null },  // Find users with null mobile
                { $set: { mobile: null } }  // Keep as null
            );
            console.log(`✅ Verified ${result.matchedCount} users`);
        }
        
        // Show sample users with mobile field
        const users = await User.find({}).limit(5).select('name email mobile role');
        console.log('\n📋 Sample users after migration:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        users.forEach(user => {
            console.log(`👤 ${user.name} (${user.role})`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Mobile: ${user.mobile || 'Not provided'}`);
            console.log('');
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🎉 Migration completed successfully!');
        console.log('💡 Mobile field is now available for all users');
        console.log('📱 Users can now recover password using mobile number\n');
        
        // Close connection
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('💡 Error details:', error);
        
        // Close connection on error
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
}

// Run the migration
addMobileField();