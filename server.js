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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// DB connect hote hi table check karega
db.connect((err) => {
  if(err) throw err;
  console.log("DB Connected");
  
  // 1. Table banayega agar nahi hai
  const createTable = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    username VARCHAR(50) UNIQUE, 
    password VARCHAR(255)
  )`;
  
  db.query(createTable, (err) => {
    if(err) throw err;
    console.log("Table ready");
    
    // 2. Admin user insert karega agar nahi hai
    const insertAdmin = `INSERT IGNORE INTO users (username, password) VALUES ('admin', 'admin@123')`;
    db.query(insertAdmin, (err) => {
      if(err) throw err;
      console.log("Admin user ready");
    });
  });
});

// WhatsApp function HATA DIYA

// Middleware
function isLoggedIn(req, res, next) {
  if(req.session.loggedin) { next(); } 
  else { res.status(401).json({error: "Not logged in"}); }
}

// Login API

// Login page dikhane ke liye
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login" style="text-align:center; margin-top:100px;">
      <h2>Admin Login</h2>
      <input name="username" placeholder="Username" required><br><br>
      <input name="password" type="password" placeholder="Password" required><br><br>
      <button type="submit">Login</button>
    </form>
  `);
});

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
