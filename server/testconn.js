require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
console.log('URI being used:', uri ? uri.substring(0, 60) + '...' : 'EMPTY/UNDEFINED');
console.log('URI length:', uri ? uri.length : 0);

if (!uri) {
  console.error('ERROR: MONGO_URI is empty!');
  process.exit(1);
}

console.log('Attempting connection...');
mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('✅ SUCCESS — Connected to MongoDB Atlas!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
