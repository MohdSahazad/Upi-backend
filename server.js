const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const QRCode = require('qrcode');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

// DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if(err) {
    console.error("DB Connection Error: ", err);
    process.exit(1);
  }
  console.log("MySQL Connected!");
});

// WhatsApp function HATA DIYA

// Middleware
function isLoggedIn(req, res, next) {
  if(req.session.loggedin) { next(); } 
  else { res.status(401).json({error: "Not logged in"}); }
}

// Login API
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.loggedin = true;
    res.json({success: true});
  } else {
    res.status(401).json({error: "Wrong credentials"});
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({success: true});
});

// Protected
app.get('/admin/transactions', isLoggedIn, (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY created_at DESC", (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    res.json(result);
  });
});

app.post('/update-status', isLoggedIn, (req, res) => {
  const { txnid, status } = req.body;
  db.query("UPDATE transactions SET status=? WHERE txnid=?", [status, txnid], (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    // WhatsApp hata diya
    res.json({success: true});
  });
});

// Public
app.post('/create-txn', (req, res) => {
  const { name, amount, txnid } = req.body;
  db.query("INSERT INTO transactions (txnid, name, amount) VALUES (?, ?, ?)", [txnid, name, amount], (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    // WhatsApp hata diya
    res.json({success: true});
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
