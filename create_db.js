// All the code is written by myself

const fs = require('fs')
const mysql = require('mysql2')

const dotenv = require('dotenv')
dotenv.config()

// Setup MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  multipleStatements: true,
})

// Read the SQL file
const sql = fs.readFileSync('./db_schema.sql', 'utf8')

// Connect to the MySQL server
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err)
    return
  }
  console.log('Connected to MySQL.')

  db.query(sql, (error, results, fields) => {
    if (error) {
      console.error('Error executing schema:', error)
      // Close the connection
      db.end()
      return
    }
    console.log('Schema executed successfully.')
    // Close the connection
    db.end()
  })
})
