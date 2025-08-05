const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
//require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(cors());

// 🔌 Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// 🟢 Register user
app.post('/register', async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  let user = await User.findOne({ $or: [{ email }, { phone }] });

  if (user) {
    return res.status(200).json({ user: { id: user._id }, message: 'User already exists' });
  }

  user = await User.create({ name, email, phone });
  res.status(201).json({ user: { id: user._id }, message: 'User registered' });
});

// 🟢 Download VCF
app.get('/vcf', async (req, res) => {
  const userId = req.query.id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const totalUsers = await User.countDocuments();
  let numberDownloadable = 5;
  if (totalUsers > 21) numberDownloadable = 20;
  else if (totalUsers > 16) numberDownloadable = 15;

  const start = user.contacts_given;
  const newContacts = await User.find({ _id: { $ne: userId } })
    .skip(start)
    .limit(numberDownloadable);

  if (newContacts.length === 0) {
    return res.status(404).json({ error: '5' });
  }

  user.contacts_given = start + numberDownloadable;
  await user.save();

  const vcf = newContacts.map(u => `
BEGIN:VCARD
VERSION:3.0
FN:${u.name}
TEL:${u.phone}
EMAIL:${u.email}
END:VCARD`).join("\n");

  res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
  res.setHeader('Content-Type', 'text/vcard');
  res.send(vcf);
});

// 🟢 Get contacts gained
/*app.get('/contactsGained', async (req, res) => {
  const userId = req.query.id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.status(200).json({ contactsGained: user.contacts_given });
  
});*/

app.get('/contactsGained', async (req, res) => {
  const userId = req.query.id;

  // 1. Validate the ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  try {
    // 2. Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 3. Return contacts_given
    res.status(200).json({ contactsGained: user.contacts_given });
  } catch (error) {
    console.error('Error in contactsGained:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// 🔊 Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
