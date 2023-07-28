const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql2')

const app = express()
const port = 5000

// Body parser middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Setting up view/templating engine
app.set('view engine', 'ejs')

// Setup MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Listing',
})

// Connect to MySQL
db.connect((err) => {
  if (err) throw err
  console.log('Connected to database!')
})

// Setup public folder
app.use(express.static('public'))
app.use('public/css', express.static(__dirname + 'public/css'))

// Setup routes
const listing = require('./routes/listing')
const host = require('./routes/host')
const error404Routes = require('./routes/error404')

app.use('/', listing)
app.use('/host', host)
app.use('*', error404Routes)

// Start the server
app.listen(port, () => console.log(`Server started on port ${port}`))
