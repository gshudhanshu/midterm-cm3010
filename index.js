// All the code is written by myself

const express = require('express')
const dotenv = require('dotenv')
dotenv.config()

const app = express()
// Body parser middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Setting up view/templating engine
app.set('view engine', 'ejs')

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
app.listen(process.env.PORT, function () {
  console.log(`Server started on port ${process.env.PORT}`)
})
