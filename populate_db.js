const fs = require('fs')
const csvParser = require('csv-parser')
const mysql = require('mysql2/promise')
const dotenv = require('dotenv')
dotenv.config()

// Setup MySQL pool connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  multipleStatements: true,
})

const filterData = (arrayOfObj, keyArr) => {
  return arrayOfObj.map((obj) =>
    keyArr.reduce((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  )
}

async function findOrCreateAmenities(amenityValues) {
  const amenityIds = []

  for (const amenityValue of amenityValues) {
    const [rows] = await pool.query(
      'SELECT amenity_id FROM amenity WHERE amenity = ?',
      [amenityValue]
    )
    if (rows.length > 0) {
      amenityIds.push(rows[0].amenity_id)
    } else {
      const [result] = await pool.query(
        'INSERT INTO amenity (amenity) VALUES (?)',
        [amenityValue]
      )
      amenityIds.push(result.insertId)
    }
  }
  return amenityIds
}

async function findOrCreateHost(hostValues) {
  const amenityIds = []
  for (const amenityValue of amenityValues) {
    const [rows] = await pool.query(
      'SELECT amenity_id FROM amenity WHERE amenity = ?',
      [amenityValue]
    )
    if (rows.length > 0) {
      amenityIds.push(rows[0].amenity_id)
    } else {
      const [result] = await pool.query(
        'INSERT INTO amenity (amenity) VALUES (?)',
        [amenityValue]
      )
      amenityIds.push(result.insertId)
    }
  }
  return amenityIds
}

async function findOrCreateEntityId(tableName, columnName, value) {
  const [rows] = await pool.query(
    `SELECT ${columnName}_id FROM ${tableName} WHERE ${columnName} = ?`,
    [value]
  )
  if (rows.length > 0) {
    return rows[0][`${columnName}_id`]
  } else {
    const [result] = await pool.query(
      `INSERT INTO ${tableName} (${columnName}) VALUES (?)`,
      [value]
    )
    return result.insertId
  }
}

async function insertData(tableName, data) {
  const keys = Object.keys(data[0])
  const values = data.map((row) => Object.values(row))

  const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES ?`

  const [result] = await pool.query(query, [values])
  return result.insertId
}

async function insertListingAmenityJunction(data) {
  const listingAmenityKeys = Object.keys(data[0])
  const listingAmenityValues = data.map((row) => Object.values(row))

  const query = `INSERT INTO listing_amenity_junction (${listingAmenityKeys.join(
    ', '
  )}) VALUES ?`
  await pool.query(query, [listingAmenityValues])
}

async function bulkInsertData(data) {
  // Find or create amenity IDs for each listing
  // this is executing
  console.log('one ', data.length)
  let idsArr = {
    amenityIds: [],
    hostLocationIds: [],
    hostNeighbourhoodIds: [],
    propertyTypeIds: [],
    roomTypeIds: [],
  }

  for (const row of data) {
    const amenityIds = await findOrCreateAmenities(row.amenities)
    idsArr.amenityIds.push(amenityIds)
  }

  // This is not executing
  console.log('two ', data.length)

  // Find or create IDs for host_location, neighborhood, property_type, room_type, and host
  for (const row of data) {
    const hostLocationId = await findOrCreateEntityId(
      'host_location',
      'host_location',
      row.host_location
    )
    idsArr.hostLocationIds.push(hostLocationId)

    const hostNeighbourhoodId = await findOrCreateEntityId(
      'neighborhood',
      'neighborhood',
      row.host_neighbourhood
    )
    idsArr.hostNeighbourhoodIds.push(hostNeighbourhoodId)

    const propertyTypeId = await findOrCreateEntityId(
      'property_type',
      'property_type',
      row.property_type
    )
    idsArr.propertyTypeIds.push(propertyTypeId)

    const roomTypeId = await findOrCreateEntityId(
      'room_type',
      'room_type',
      row.room_type
    )
    idsArr.roomTypeIds.push(roomTypeId)
  }

  // Insert listing_url and store generated listing_url_id
  const listingUrlIds = await insertData(
    'listing_url',
    filterData(data, ['listing_url', 'picture_url'])
  )

  // // Insert host_url and store generated host_url_id
  // const hostUrlIds = await insertData(
  //   'host_url',
  //   filterData(data, ['host_url', 'host_picture_url'])
  // )

  // // Insert review and store generated review_id
  // const reviewIds = await insertData(
  //   'review',
  //   filterData(data, ['number_of_reviews', 'review_scores_rating'])
  // )

  // const filteredDataForHost = filterData(data, [])
  // // Now insert host and listing tables, using the generated foreign key values
  // const hostIds = await insertData(
  //   'host',
  //   data.map((row, index) => ({
  //     ...row,
  //     host_url_id: hostUrlIds[index],
  //     host_location_id: idsArr.hostLocationIds[index],
  //   }))
  // )

  // const listingData = data.listing.map((row, index) => ({
  //   ...row,
  //   listing_url_id: listingUrlIds[index],
  //   host_id: hostIds[index],
  //   neighborhood_id: row.neighborhood_id,
  //   geo_location_id: row.geo_location_id,
  //   property_type_id: row.property_type_id,
  //   room_type_id: row.room_type_id,
  // }))

  // const listingIds = await insertData('listing', listingData)

  // Insert the listing_amenity_junction table
  // await insertListingAmenityJunction(data.listing_amenity_junction)
}

async function readCSVFile(filePath, chunkSize) {
  const rows = []
  let chunkCount = 0
  currentChunk = {
    listing_url: [],
    host_url: [],
    host_location: [],
    neighborhood: [],
    geo_location: [],
    property_type: [],
    room_type: [],
    amenity: [],
    review: [],
    host: [],
    listing: [],
    listing_amenity_junction: [],
  }

  return new Promise((resolve, reject) => {
    const parser = fs.createReadStream(filePath).pipe(
      csvParser({
        mapHeaders: ({ header }) => {
          if (header === 'id') return 'listing_id'
          else {
            return header
          }
        },
      })
    )

    parser.on('data', async (row) => {
      row.amenities = row.amenities.replace(/'/g, '"')
      row.amenities = JSON.parse(row.amenities)

      rows.push(row)
      if (rows.length === chunkSize) {
        const chunk = rows.splice(0, chunkSize)
        try {
          await bulkInsertData(chunk)
          chunkCount++
          console.log(`Processed chunk ${chunkCount}: ${chunkSize} rows.`)
        } catch (error) {
          reject(error)
        }
      }
    })

    parser.on('end', async () => {
      if (rows.length > 0) {
        try {
          await bulkInsertData(rows)
          chunkCount++
          console.log(`Processed chunk ${chunkCount}: ${rows.length} rows.`)
        } catch (error) {
          reject(error)
        }
      }
    })

    parser.on('error', (error) => {
      reject(error)
    })
    parser.on('close', () => {
      resolve()
    })
  })
}

// Assuming you have the CSV file path and chunk size defined
const filePath = './csv/listings.csv'
const chunkSize = 3

readCSVFile(filePath, chunkSize)
  .then(() => {
    console.log('Bulk insertion completed successfully.')
    pool.end()
  })
  .catch((error) => {
    console.error('Error during bulk insertion:', error)
    pool.end()
  })
