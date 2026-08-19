const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const QRCode = require('qrcode');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Railway par https hai to true kar dena
}));

// DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// WhatsApp Function
async function sendWhatsApp(message) {
  let phone = process.env.ADMIN_WHATSAPP;
  let apikey = process.env.WHATSAPP_API_KEY;
  let url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apikey}`;
  await axios.get(url).catch(e => console.log(e));
}

// Middleware: Check login
function isLoggedIn(req, res, next) {
  if(req.session.loggedin) {
    next();
  } else {
    res.redirect('/login.html');
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
  res.redirect('/login.html');
});

// 3. Protected Routes
app.get('/admin/transactions', isLoggedIn, (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY created_at DESC", (err, result) => {
    res.json(result);
  });
});

app.post('/update-status', isLoggedIn, (req, res) => {
  const { txnid, status } = req.body;
  db.query("UPDATE transactions SET status=? WHERE txnid=?", [status, txnid]);
  let msg = `✅ Payment Update\nTXN: ${txnid}\nStatus: ${status.toUpperCase()}`;
  sendWhatsApp(msg);
  res.json({success: true});
});

// 4. Public Routes
app.post('/create-txn', (req, res) => {
  const { name, amount, txnid } = req.body;
  db.query("INSERT INTO transactions (txnid, name, amount) VALUES (?, ?, ?)", [txnid, name, amount]);
  let msg = `🔔 Naya Payment Request\nTXN: ${txnid}\nName: ${name}\nAmount: ₹${amount}\nStatus: Pending`;
  sendWhatsApp(msg);
  res.json({success: true});
});

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));

const cors = require('cors');
app.use(cors());
