const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: "*", credentials: true }));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'secretkey123',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: { secure: true, sameSite: 'none', maxAge: 1000 * 60 * 60 }
}));

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

  const createUsers = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    username VARCHAR(50) UNIQUE, 
    password VARCHAR(255)
  )`;
  
  db.query(createUsers, (err) => {
    if(err) throw err;
    console.log("Users table ready");
    
    const createTxn = `CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      txnid VARCHAR(100) UNIQUE,
      name VARCHAR(100),
      amount VARCHAR(20),
      status VARCHAR(20) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    db.query(createTxn, (err) => {
      if(err) throw err;
      console.log("Transactions table ready");

      const insertAdmin = `INSERT IGNORE INTO users (username, password) VALUES ('admin', 'admin@123')`;
      db.query(insertAdmin, (err) => {
        if(err) throw err;
        console.log("Admin user ready");
      });
    });
  });
});

function isLoggedIn(req, res, next) {
  if(req.session.loggedin) { next(); } 
  else { res.status(401).json({error: "Not logged in"}); }
}

app.get('/login', (req, res) => {
  res.send(`
    <html><body style="font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f0f0">
      <form method="POST" action="/login" style="background:white; padding:30px; border-radius:10px; box-shadow:0 0 10px #ccc">
        <h2>Admin Login</h2>
        <input type="text" name="username" placeholder="Username" required style="width:100%; padding:10px; margin:10px 0"><br>
        <input type="password" name="password" placeholder="Password" required style="width:100%; padding:10px; margin:10px 0"><br>
        <button type="submit" style="width:100%; padding:10px; background:green; color:white; border:none; border-radius:5px">Login</button>
      </form>
    </body></html>
  `);
});

app.post('/login', (req, res) => {
  let { username, password } = req.body;
  username = username.trim();
  password = password.trim();
  if(username === 'admin' && password === 'admin@123') {
      req.session.loggedin = true;
      return res.redirect('/admin/transactions');
  }
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

app.get('/admin/transactions', isLoggedIn, (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY created_at DESC", (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    res.json(result);
  });
});

app.get('/transactions', (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY created_at DESC", (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    res.json(result);
  });
});

app.post('/update-status', isLoggedIn, (req, res) => {
  const { txnid, status } = req.body;
  db.query("UPDATE transactions SET status=? WHERE txnid=?", [status, txnid], (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.post('/create-txn', (req, res) => {
  const { name, amount, txnid } = req.body;
  db.query("INSERT INTO transactions (txnid, name, amount) VALUES (?, ?, ?)", [txnid, name, amount], (err, result) => {
    if(err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.get('/', (req,res)=> res.send("Backend OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
