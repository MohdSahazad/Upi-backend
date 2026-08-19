const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const QRCode = require('qrcode');
const axios = require('axios');
const session = require('express-session');
require('dotenv').config(); // bcrypt hata diya, use nahi ho raha tha

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

// DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// CHANGE 1: DB connect check add kiya
db.connect((err) => {
  if(err) {
    console.error("DB Connection Error: ", err);
    process.exit(1); // Agar DB nahi lagi to crash kar jao
  }
  console.log("MySQL Connected!");
});

// WhatsApp Function
async function sendWhatsApp(message) {
  let phone = process.env.ADMIN_WHATSAPP;
  let apikey = process.env.WHATSAPP_API_KEY;
  if(!phone || !apikey) return; // Agar key nahi hai to skip
  let url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apikey}`;
  await axios.get(url).catch(e => console.log("WhatsApp Error:", e.message));
}

// Middleware: Check login
function isLoggedIn(req, res, next) {
  if(req.session.loggedin) {
    next();
  } else {
    res.status(401).json({error: "Not logged in"}); // redirect ki jagah json
  }
}

// 1. Login API
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.loggedin = true;
    res.json({success: true});
  } else {
    res.status(401).json({error: "Wrong credentials"});
  }
});

// 2. Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({success: true}); // redirect ki jagah json
});

// 3. Protected Routes
app.get('/admin/transactions', isLoggedIn, (req, res) => {
  // CHANGE 2: Error handling add ki
  db.query("SELECT * FROM transactions ORDER BY created_at DESC", (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    res.json(result);
  });
});

app.post('/update-status', isLoggedIn, (req, res) => {
  const { txnid, status } = req.body;
  // CHANGE 3: Error handling add ki
  db.query("UPDATE transactions SET status=? WHERE txnid=?", [status, txnid], (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    let msg = `✅ Payment Update\nTXN: ${txnid}\nStatus: ${status.toUpperCase()}`;
    sendWhatsApp(msg);
    res.json({success: true});
  });
});

// 4. Public Routes
app.post('/create-txn', (req, res) => {
  const { name, amount, txnid } = req.body;
  // CHANGE 4: Error handling add ki
  db.query("INSERT INTO transactions (txnid, name, amount) VALUES (?, ?, ?)", [txnid, name, amount], (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    let msg = `🔔 Naya Payment Request\nTXN: ${txnid}\nName: ${name}\nAmount: ₹${amount}\nStatus: Pending`;
    sendWhatsApp(msg);
    res.json({success: true});
  });
});

const PORT = process.env.PORT || 3000; // CHANGE 5: PORT ko variable me liya
app.listen(PORT, () => console.log(`Server running on ${PORT}`));