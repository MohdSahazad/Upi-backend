CREATE DATABASE upi_gateway;
USE upi_gateway;
CREATE TABLE transactions ( 
  id INT AUTO_INCREMENT PRIMARY KEY, 
  txnid VARCHAR(50) UNIQUE, 
  name VARCHAR(100), 
  amount DECIMAL(10,2), 
  status ENUM('pending','success','failed') DEFAULT 'pending', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);