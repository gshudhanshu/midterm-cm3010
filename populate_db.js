const fs = require('fs')
const csvParser = require('csv-parser')
const mysql = require('mysql2')
const dotenv = require('dotenv')
dotenv.config()

// Setup MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
})

// CSV file path
const csvPath = './csv/listings.csv'

// Chunk size for inserting data into the database
const chunkSize = 1000

// Main function to populate the database
async function populateDatabase() {
  const data = []

  fs.createReadStream(csvPath)
    .pipe(
      csvParser({
        mapHeaders: ({ header }) => {
          if (header === 'id') return 'listing_id'
          header.trim()
          header.toLowerCase()
        },
      })
    )
    .on('data', (row) => data.push(row))
    .on('end', async () => {
      try {
        // Insert data into each table
        await insertDataIntoTable(
          'listing_url',
          data.map(({ listing_url, picture_url }) => [
            listing_url,
            picture_url,
          ]),
          db
        )

        console.log('Data insertion completed.')
        db.end()
      } catch (error) {
        console.error('Error inserting data into tables:', error)
        db.end()
      }
    })
}

// Call the main function to start populating the database
populateDatabase()
