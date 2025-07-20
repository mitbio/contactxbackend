const fs = require('fs');
const express = require('express');
const cors = require('cors');
const app = express();

// Use environment variable or fallback to 3000
const PORT = process.env.PORT || 3000;
const filePath = 'data.json';

app.use(express.json());
app.use(cors());

// Load users from file
let users = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];

// 🟢 Register user
app.post('/register', (req, res) => {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = users.find(u => u.email === email || u.phone === phone);
    if (existingUser) {
        return res.status(200).json({ user: { id: existingUser.id }, message: 'User already exists' });
    }

    const newId = users.length > 0 ? users[users.length - 1].id + 1 : 1;
    const newUser = { id: newId, name, email, phone, contacts_given: 0 };
    users.push(newUser);

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    res.status(201).json({ user: { id: newId }, message: 'User registered' });
});

// 🟢 Download VCF
app.get("/vcf", (req, res) => {
    const userId = parseInt(req.query.id);
    const usersData = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];
    const userIndex = usersData.findIndex(u => u.id === userId);

    if (userIndex === -1) return res.status(404).json({ error: "User not found" });

    const user = usersData[userIndex];
    let numberDownloadable = 5;
    if (usersData.length > 21) numberDownloadable = 20;
    else if (usersData.length > 16) numberDownloadable = 15;

    const start = user.contacts_given || 0;
    const end = start + numberDownloadable;

    const newContacts = usersData.filter(u => u.id !== userId).slice(start, end);

    if (newContacts.length === 0) {
        return res.status(200).json({ error: "5" }); // You might want to return a proper message later
    }

    usersData[userIndex].contacts_given = end;
    fs.writeFileSync(filePath, JSON.stringify(usersData, null, 2));

    const vcf = newContacts.map(u => `
BEGIN:VCARD
VERSION:3.0
FN:${u.name}
TEL:${u.phone}
EMAIL:${u.email}
END:VCARD`).join("\n");

    res.setHeader("Content-Disposition", "attachment; filename=contacts.vcf");
    res.setHeader("Content-Type", "text/vcard");
    res.send(vcf);
});

// 🟢 Get contacts gained
app.get("/contactsGained", (req, res) => {
    const userId = parseInt(req.query.id);
    const usersData = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];
    const user = usersData.find(u => u.id === userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ contactsGained: user.contacts_given });
});

// 🔊 Start server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
