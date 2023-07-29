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

async function insertData(tableName, data) {
  const query = `INSERT INTO ${tableName} SET ?`

  try {
    const [results] = await db.promise().query(query, data)
    console.log(`Inserted row with ID: ${results.insertId} into ${tableName}`)
  } catch (error) {
    throw error
  }
}

// Main function to populate the database
async function populateDatabase() {
  fs.createReadStream(csvPath)
    .pipe(
      csvParser({
        mapHeaders: ({ header }) => {
          if (header === 'id') return 'listing_id'
          else {
            return header
          }
        },
      })
    )
    .on('data', async (row) => {
      //   https://stackoverflow.com/questions/41402834/convert-string-array-to-array-in-javascripthttps://stackoverflow.com/questions/41402834/convert-string-array-to-array-in-javascript
      row.amenities = row.amenities.replace(/'/g, '"')
      row.amenities = JSON.parse(row.amenities)

      //   const listing_url = {
      //     listing_url: row.listing_url,
      //     picture_url: row.picture_url,
      //   }

      //   let listing_url_id_arr = insertData('listing_url', [listing_url])

      const host_url = {
        host_url: row.host_url,
        host_picture_url: row.host_picture_url,
      }

      const host_location = {
        host_location: row.host_location,
      }

      const hostUrlId = await insertData('host_url', host_url)
      const hostLocationId = await insertData('host_location', host_location)

      const host = {
        host_id: row.host_id,
        host_name: row.host_name,
        host_about: row.host_about,
        host_neighbourhood: row.host_neighbourhood,
        host_total_listings_count: row.host_total_listings_count,
        host_url_id: hostUrlId,
        host_location_id: hostLocationId,
      }

      insertData('host', [host])
    })
    .on('end', () => {
      console.log('Data insertion completed.')
      db.end() // Close the MySQL connection when done.
    })
}

// Call the main function to start populating the database
populateDatabase()
