const express = require('express')
const mysql = require('mysql2')
const dotenv = require('dotenv')
dotenv.config()

const app = express()

// Body parser middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Setup MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
})

// Connect to MySQL
db.connect((err) => {
  if (err) throw err
  console.log('Connected to database!')
})

// Setting up view/templating engine
app.set('view engine', 'ejs')

// Setup public folder
app.use(express.static('public'))
app.use('public/css', express.static(__dirname + 'public/css'))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// // Setup routes
// const listing = require('./routes/listing')
// const host = require('./routes/host')
// const error404Routes = require('./routes/error404')

// app.use('/', listing)
// app.use('/host', host)
// app.use('*', error404Routes)

// Start the server
app.listen(() => console.log(`Server started on port ${process.env.PORT}`))