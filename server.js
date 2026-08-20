const cors = require('cors');
app.use(cors());
const express = require('express');
const mysql = require('mysql2');
//const bodyParser = require('body-parser');
const cors = require('cors');
const QRCode = require('qrcode');
const session = require('express-session');
require('dotenv').config();


const app = express();
app.set('trust proxy', 1); // 1

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({  // 2
  secret: 'secretkey123',
  resave: false, 
  saveUninitialized: false,
  proxy: true,
  cookie: { secure: true, sameSite: 'none', maxAge: 1000 * 60 * 60 }
}));

// DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// DB connect hote hi table check karega - SIRF 1 BAAR
db.connect((err) => {
  if(err) {
    console.error("DB Connection Error: ", err);
    process.exit(1);
  }
  console.log("MySQL Connected!");
  
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
// 1. Login page dikhao - GET
app.get('/login', (req, res) => {
  res.send(`
    <html>
    <body style="font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f0f0">
      <form method="POST" action="/login" style="background:white; padding:30px; border-radius:10px; box-shadow:0 0 10px #ccc">
        <h2>Admin Login</h2>
        <input type="text" name="username" placeholder="Username" required style="width:100%; padding:10px; margin:10px 0"><br>
        <input type="password" name="password" placeholder="Password" required style="width:100%; padding:10px; margin:10px 0"><br>
        <button type="submit" style="width:100%; padding:10px; background:green; color:white; border:none; border-radius:5px">Login</button>
      </form>
    </body>
    </html>
  `);
});

// 2. Login check karo - POST

app.post('/login', (req, res) => {
  console.log("Body:", req.body); 
  let { username, password } = req.body;

  username = username.trim(); // <- YE 1 LINE ADD KARO
  password = password.trim(); // <- YE BHI

  // PEHLE HARDCODE CHECK KARENGE - JUGAD
  if(username === 'admin' && password === 'admin@123') {
      req.session.loggedin = true;
      return res.redirect('/admin/transactions');
  }
  // FIR DB CHECK KARENGE
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(query, [username, password], (err, results) => {
    if(err) return res.send("DB Error: " + err);
    
    if(results.length > 0) {
      req.session.loggedin = true;
      res.redirect('/admin/transactions');
    } else {
      res.send('Wrong credentials! <a href="/login">Wapas jao</a>');
    }
  });
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
