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

const filterData = (arrayOfObj) => {
  objArr = {
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
  }
  arrayOfObj.reduce((acc, curr) => {
    objArr.listing_url.push({
      listing_url: curr.listing_url,
      picture_url: curr.picture_url,
    })

    objArr.host_url.push({
      host_url: curr.host_url,
      host_picture_url: curr.host_picture_url,
    })

    objArr.host_location.push({
      host_location: curr.host_location,
    })

    objArr.neighborhood.push({
      neighborhood: curr.neighborhood,
    })

    objArr.geo_location.push({
      latitude: curr.latitude,
      longitude: curr.longitude,
    })

    objArr.property_type.push({
      property_type: curr.property_type,
    })

    objArr.room_type.push({
      room_type: curr.room_type,
    })

    objArr.amenity.push({
      amenities: curr.amenities,
    })

    objArr.review.push({
      number_of_reviews: curr.number_of_reviews,
      review_scores_rating: curr.review_scores_rating,
    })

    objArr.host.push({
      host_id: curr.host_id,
      host_name: curr.host_name,
      host_about: curr.host_about,
      host_neighbourhood: curr.host_neighbourhood,
      host_total_listings_count: curr.host_total_listings_count,
    })

    objArr.listing.push({
      listing_id: curr.listing_id,
      name: curr.name,
      description: curr.description,
      neighborhood_overview: curr.neighborhood_overview,
      accommodates: curr.accommodates,
      bedrooms: curr.bedrooms,
      beds: curr.beds,
      bathrooms_text: curr.bathrooms_text,
      availability_365: curr.availability_365,
      price: curr.price,
    })

    return acc
  }, objArr)
  return objArr
}

async function findOrCreateAmenities(amenityValues) {
  const amenityIds = []

  for (const amenityValue of amenityValues) {
    try {
      const [rows] = await pool.query(
        'INSERT INTO amenity (amenity) VALUES (?) ON DUPLICATE KEY UPDATE amenity_id=LAST_INSERT_ID(amenity_id)',
        [amenityValue]
      )

      amenityIds.push(rows.insertId)
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        // Amenity already exists, fetch its ID instead
        const [existingRows] = await pool.query(
          'SELECT amenity_id FROM amenity WHERE amenity = ?',
          [amenityValue]
        )

        amenityIds.push(existingRows[0].amenity_id)
      } else {
        // Handle other errors (if necessary)
        console.error('Error while finding or creating amenity:', error)
      }
    }
  }
  return amenityIds
}

async function findOrCreate(tableName, data, idColumn = false) {
  const keys = Object.keys(data[0])
  const values = data.map((row) =>
    Object.values(row).map((value) => (value === '' ? null : value))
  )

  const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES ? 
                 ON DUPLICATE KEY UPDATE ${idColumn} = VALUES(${idColumn})`

  const [result] = await pool.query(query, [values])

  let insertedIds = []
  if (idColumn) {
    // Retrieve the IDs of the inserted rows based on the predefined IDs
    insertedIds = data.map((row) => row[idColumn])
  } else {
    // Get the IDs of all inserted rows
    for (let i = 0; i < result.affectedRows; i++) {
      insertedIds.push(result.insertId + i)
    }
  }

  return insertedIds
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

async function insertData(tableName, data, idColumn = false) {
  const keys = Object.keys(data[0])
  const values = data.map((row) =>
    Object.values(row).map((value) => (value === '' ? null : value))
  )

  const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES ?`

  const [result] = await pool.query(query, [values])

  let insertedIds = []
  if (idColumn) {
    // Retrieve the IDs of the inserted rows based on the predefined IDs
    insertedIds = data.map((row) => row[idColumn])
  } else {
    // Get the IDs of all inserted rows
    for (let i = 0; i < result.affectedRows; i++) {
      insertedIds.push(result.insertId + i)
    }
  }

  return insertedIds
}

async function insertListingAmenityJunction(listingIds, amenityIds) {
  const values = []
  for (let i = 0; i < listingIds.length; i++) {
    for (const amenityId of amenityIds[i]) {
      values.push([listingIds[i], amenityId])
    }
  }
  const query =
    'INSERT INTO listing_amenity_junction (listing_id, amenity_id) VALUES ?'
  await pool.query(query, [values])
}

async function bulkInsertData(data) {
  // Find or create amenity IDs for each listing
  let idsArr = {
    amenityIds: [],
    hostLocationIds: [],
    hostNeighbourhoodIds: [],
    propertyTypeIds: [],
    roomTypeIds: [],
  }
  for (const row of data.amenity) {
    const amenityIds = await findOrCreateAmenities(row.amenities)
    idsArr.amenityIds.push(amenityIds)
  }

  // Find or create IDs for host_location, neighborhood, property_type, room_type, and host
  for (let i = 0; i < data.listing.length; i++) {
    const hostLocationId = await findOrCreateEntityId(
      'host_location',
      'host_location',
      data.host_location[i].host_location
    )
    idsArr.hostLocationIds.push(hostLocationId)

    const hostNeighbourhoodId = await findOrCreateEntityId(
      'neighborhood',
      'neighborhood',
      data.host[i].host_neighbourhood
    )
    idsArr.hostNeighbourhoodIds.push(hostNeighbourhoodId)

    const propertyTypeId = await findOrCreateEntityId(
      'property_type',
      'property_type',
      data.property_type[i].property_type
    )
    idsArr.propertyTypeIds.push(propertyTypeId)

    const roomTypeId = await findOrCreateEntityId(
      'room_type',
      'room_type',
      data.room_type[i].room_type
    )
    idsArr.roomTypeIds.push(roomTypeId)
  }

  // Insert listing_url and store generated listing_url_id
  const listingUrlIds = await insertData('listing_url', data.listing_url)
  const geoLocationIds = await insertData('geo_location', data.geo_location)
  const neighborhoodIds = await insertData('neighborhood', data.neighborhood)

  // Insert host_url and store generated host_url_id
  const hostUrlIds = await insertData('host_url', data.host_url)

  // Insert review and store generated review_id
  const reviewIds = await insertData('review', data.review)

  // Now insert host and listing tables, using the generated foreign key values
  const hostIds = await findOrCreate(
    'host',
    data.host.map((row, index) => ({
      ...row,
      host_url_id: hostUrlIds[index],
      host_location_id: idsArr.hostLocationIds[index],
    })),
    'host_id'
  )

  const listingIds = await findOrCreate(
    'listing',
    data.listing.map((row, index) => ({
      ...row,
      price: parseFloat(row.price.replace(/[$,]/g, '')),
      bedrooms: parseInt(row.bedrooms) || null,
      listing_url_id: listingUrlIds[index],
      review_id: reviewIds[index],
      host_id: data.host[index].host_id,
      neighborhood_id: neighborhoodIds[index],
      geo_location_id: geoLocationIds[index],
      property_type_id: idsArr.propertyTypeIds[index],
      room_type_id: idsArr.roomTypeIds[index],
    })),
    'listing_id'
  )

  // // Insert the listing_amenity_junction table
  await insertListingAmenityJunction(listingIds, idsArr.amenityIds)
}

async function readCSVFile(filePath, chunkSize) {
  let rows = []
  let chunkCount = 0
  const allChunks = []

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
    const processChunk = async (chunk) => {
      try {
        const splitedChunk = filterData(chunk)
        // console.log(splitedChunk.listing_url)
        await bulkInsertData(splitedChunk)
        console.log(`Processed ${chunk.length} rows.`)
        chunkCount++
      } catch (error) {
        reject(error)
      }
    }

    parser.on('data', async (row) => {
      // row.amenities = row.amenities.replace(/'/g, '"').split(',')
      // row.amenities = row.amenities.replace(/\[|\]/g, '').split(',')
      row.amenities = JSON.parse(row.amenities)
      // console.log(row.amenities)
      rows.push(row)

      if (rows.length === chunkSize) {
        const chunk = rows.splice(0, chunkSize)
        try {
          parser.pause()
          allChunks.push(processChunk(chunk))
          parser.resume()
        } catch (error) {
          reject(error)
        }
      }
    })

    parser.on('end', async () => {
      if (rows.length > 0) {
        try {
          allChunks.push(processChunk(rows))
        } catch (error) {
          reject(error)
        }
      }

      try {
        await Promise.all(allChunks)
        resolve()
      } catch (error) {
        reject(error)
      }
    })

    parser.on('error', (error) => {
      reject(error)
    })
  })
}

// Assuming you have the CSV file path and chunk size defined
const filePath = './csv/listings.csv'
const chunkSize = 500

readCSVFile(filePath, chunkSize)
  .then(() => {
    console.log('Bulk insertion completed successfully.')
    pool.end()
  })
  .catch((error) => {
    console.error('Error during bulk insertion:', error)
    pool.end()
  })
