const express = require('express')
const router = express.Router()
const pool = require('../dbconnection')

/**
 * @api {get} /listing/add-listing
 * Add new listing
 */
router.get('/listing/add-listing', async (req, res) => {
  try {
    // Fetch data from foreign tables
    const hosts = await pool.query('SELECT host_id, host_name FROM host')
    const roomTypes = await pool.query(
      'SELECT room_type_id, room_type FROM room_type'
    )
    const propertyTypes = await pool.query(
      'SELECT property_type_id, property_type FROM property_type'
    )

    res.render('add-listing', {
      pageInfo: { title: 'Add new listing' },
      hosts: hosts[0],
      room_types: roomTypes[0],
      property_types: propertyTypes[0],
    })
  } catch (err) {
    console.error('Error fetching data:', err)
    res.status(500).send('Internal Server Error')
  }
})

/**
 * @api {post} /listing/add-listing Add new listing
 */
router.post('/listing/add-listing', async (req, res) => {
  // Destructure the request body
  let {
    name,
    description,
    neighbourhood_overview,
    neighbourhood,
    amenities,
    accommodates,
    bedrooms,
    beds,
    latitude,
    longitude,
    bathrooms_text,
    room_type,
    property_type,
    availability_365,
    picture_url,
    price,
    host_id,
  } = req.body

  // Set default values for optional fields
  accommodates = accommodates !== '' ? accommodates : null
  bedrooms = bedrooms !== '' ? bedrooms : null
  beds = beds !== '' ? beds : null
  availability_365 = availability_365 !== '' ? availability_365 : null
  latitude = latitude !== '' ? latitude : null
  longitude = longitude !== '' ? longitude : null

  // If picture_url is empty, set it to a default value
  // This image is taken from Wikimedia Commons
  // https://commons.wikimedia.org/wiki/File:No_Image_Available.jpg
  picture_url =
    picture_url !== ''
      ? picture_url
      : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'

  // We'll hardcode listing_url which is a link to the listing on Airbnb
  const listing_url = 'https://www.airbnb.co.in'

  // SQL queries to insert into foreign tables
  const addListingUrlQuery = `INSERT INTO listing_url (listing_url, picture_url
    ) VALUES (?, ?)`
  const addNeighbourhoodQuery = `INSERT INTO neighbourhood (neighbourhood)
                                VALUES (?)
                                ON DUPLICATE KEY UPDATE neighbourhood = VALUES(neighbourhood),
                                neighbourhood_id = LAST_INSERT_ID(neighbourhood_id)`
  const addGeoLocationQuery = ` INSERT INTO geo_location (latitude, longitude) VALUES (?, ?)`
  const addPropertyTypeQuery = `INSERT INTO property_type (property_type)
                                VALUES (?)
                                ON DUPLICATE KEY UPDATE property_type = VALUES(property_type),
                                property_type_id = LAST_INSERT_ID(property_type_id)`
  const addRoomTypeQuery = `INSERT INTO room_type (room_type)
                            VALUES (?)
                            ON DUPLICATE KEY UPDATE room_type = VALUES(room_type),
                            room_type_id = LAST_INSERT_ID(room_type_id)`
  const addAmenityQuery = `INSERT INTO amenity (amenity)
                           VALUES (?)
                           ON DUPLICATE KEY UPDATE amenity = VALUES(amenity),
                           amenity_id = LAST_INSERT_ID(amenity_id)`
  const addReviewQuery = `INSERT INTO review
                          (number_of_reviews, review_scores_rating)
                          VALUES (?, ?)`

  // Inserting into foreign tables
  const listingUrlResult = await pool.query(addListingUrlQuery, [
    listing_url,
    picture_url,
  ])
  const neighbourhoodResult = await pool.query(addNeighbourhoodQuery, [
    neighbourhood,
  ])
  const geoLocationResult = await pool.query(addGeoLocationQuery, [
    latitude,
    longitude,
  ])
  const propertyTypeResult = await pool.query(addPropertyTypeQuery, [
    property_type,
  ])
  const roomTypeResult = await pool.query(addRoomTypeQuery, [room_type])

  // Inserting into amenities table
  const amenityIds = []
  if (amenities && amenities.length > 0) {
    amenities.split(',').forEach(async (amenity) => {
      let amenityId = await pool.query(addAmenityQuery, [amenity.trim()])
      amenityIds.push(amenityId[0].insertId)
    })
  }

  // Inserting 0 number_of_reviews and 0 review_scores_rating as it is new listing
  const reviewResult = await pool.query(addReviewQuery, [0, 0])

  // Getting the IDs of the inserted records
  const listing_url_id = listingUrlResult[0].insertId
  const neighbourhood_id = neighbourhoodResult[0].insertId
  const geo_location_id = geoLocationResult[0].insertId
  const property_type_id = propertyTypeResult[0].insertId
  const room_type_id = roomTypeResult[0].insertId
  const review_id = reviewResult[0].insertId

  // After inserting foreign table values, we can now insert into the listing table
  const addListingQuery = `INSERT INTO listing
    (name, description, neighbourhood_overview, accommodates, bedrooms, beds, bathrooms_text, availability_365, price,
    listing_url_id, host_id, neighbourhood_id, geo_location_id, property_type_id, room_type_id, review_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  const listingResult = await pool.query(addListingQuery, [
    name,
    description,
    neighbourhood_overview,
    accommodates,
    bedrooms,
    beds,
    bathrooms_text,
    availability_365,
    price,
    listing_url_id,
    host_id,
    neighbourhood_id,
    geo_location_id,
    property_type_id,
    room_type_id,
    review_id,
  ])

  // Inserting into listing_amenity_junction table
  if (amenityIds.length > 0) {
    const addListingAmenityJunctionQuery = `INSERT INTO listing_amenity_junction (listing_id, amenity_id)
                                             VALUES (?, ?)`
    amenityIds.forEach(async (amenityId) => {
      await pool.query(addListingAmenityJunctionQuery, [
        listingResult[0].insertId,
        amenityId,
      ])
    })
  }

  // Increment number_of_listings for the host
  await pool.query(
    `UPDATE host SET host_total_listings_count = host_total_listings_count + 1 WHERE host_id = ?`,
    [host_id]
  )

  res.redirect('/listing/' + listingResult[0].insertId)
})

/**
 * @api {get} /listing/edit/:id
 * Edit listing
 */

router.get('/listing/edit/:id', async (req, res) => {
  // Get listing ID from the params
  let listing_id = req.params.id
  try {
    // SQL query to fetch listing details
    let query = `SELECT listing.*, listing_url.*, host.*, host_url.*, neighbourhood.*, 
                geo_location.*, property_type.*, room_type.*, review.*,
                GROUP_CONCAT(amenity.amenity SEPARATOR ', ') AS amenities
                FROM listing
                LEFT JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                LEFT JOIN host ON listing.host_id = host.host_id
                LEFT JOIN host_url ON host.host_url_id = host_url.host_url_id
                LEFT JOIN neighbourhood ON listing.neighbourhood_id = neighbourhood.neighbourhood_id
                LEFT JOIN geo_location ON listing.geo_location_id = geo_location.geo_location_id
                LEFT JOIN property_type ON listing.property_type_id = property_type.property_type_id
                LEFT JOIN room_type ON listing.room_type_id = room_type.room_type_id
                LEFT JOIN review ON listing.review_id = review.review_id
                LEFT JOIN listing_amenity_junction ON listing.listing_id = listing_amenity_junction.listing_id
                LEFT JOIN amenity ON listing_amenity_junction.amenity_id = amenity.amenity_id
                WHERE listing.listing_id = ?
                GROUP BY listing.listing_id
                LIMIT 1`

    // Fetch data from foreign tables
    const hosts = await pool.query('SELECT host_id, host_name FROM host')
    const roomTypes = await pool.query(
      'SELECT room_type_id, room_type FROM room_type'
    )
    const propertyTypes = await pool.query(
      'SELECT property_type_id, property_type FROM property_type'
    )
    // Fetch listing details
    const [result] = await pool.query(query, [listing_id])

    res.render('edit-listing', {
      listing: result[0],
      pageInfo: { title: 'Edit Listing' },
      hosts: hosts[0],
      room_types: roomTypes[0],
      property_types: propertyTypes[0],
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('Error fetching listing details')
  }
})

/**
 * @api {post} /listing/edit/:id
 * Edit listing
 */
router.post('/listing/edit/:id', async (req, res) => {
  try {
    // Destructure the request body
    let {
      name,
      description,
      neighbourhood_overview,
      neighbourhood,
      amenities,
      accommodates,
      bedrooms,
      beds,
      latitude,
      longitude,
      bathrooms_text,
      room_type,
      property_type,
      availability_365,
      picture_url,
      price,
      host_id,
    } = req.body

    // Get listing ID from the params
    let listing_id = req.params.id

    // Set default values for optional fields
    accommodates = accommodates !== '' ? accommodates : null
    bedrooms = bedrooms !== '' ? bedrooms : null
    beds = beds !== '' ? beds : null
    availability_365 = availability_365 !== '' ? availability_365 : null
    latitude = latitude !== '' ? latitude : null
    longitude = longitude !== '' ? longitude : null

    // If picture_url is empty, set it to a default value
    // This image is taken from Wikimedia Commons
    // https://commons.wikimedia.org/wiki/File:No_Image_Available.jpg
    picture_url =
      picture_url !== ''
        ? picture_url
        : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'

    // We'll hardcode host_url which is a link to the host's profile on Airbnb
    const listing_url = 'https://www.airbnb.co.in'

    // SQL queries to update foreign tables
    const updateListingUrlQuery = `UPDATE listing_url
                                 SET listing_url = ?, picture_url = ?
                                 WHERE listing_url_id = ?`

    const updateGeoLocationQuery = `UPDATE geo_location SET latitude = ?, longitude = ?
                                    WHERE geo_location_id = ?`

    const addPropertyTypeQuery = `INSERT INTO property_type (property_type)
                                  VALUES (?)
                                  ON DUPLICATE KEY UPDATE property_type = VALUES(property_type),
                                  property_type_id = LAST_INSERT_ID(property_type_id)`

    const addRoomTypeQuery = `INSERT INTO room_type (room_type)
                              VALUES (?)
                              ON DUPLICATE KEY UPDATE room_type = VALUES(room_type),
                              room_type_id = LAST_INSERT_ID(room_type_id)`

    const addAmenityQuery = `INSERT INTO amenity (amenity)
                              VALUES (?)
                              ON DUPLICATE KEY UPDATE amenity = VALUES(amenity),
                              amenity_id = LAST_INSERT_ID(amenity_id)`

    const getListingQuery = `SELECT * FROM listing WHERE listing_id = ? LIMIT 1`

    // Fetch listing details
    const [listing] = await pool.query(getListingQuery, [listing_id])

    // Update listing_url record
    await pool.query(updateListingUrlQuery, [
      listing_url,
      picture_url,
      listing[0].listing_url_id,
    ])

    // SQL query to update neighbourhood record
    const updateNeighbourhoodQuery = `INSERT INTO neighbourhood (neighbourhood)
    VALUES (?) AS NEW
    ON DUPLICATE KEY UPDATE neighbourhood = VALUES(neighbourhood),
    neighbourhood_id = LAST_INSERT_ID(neighbourhood_id)
    `

    // Update or insert neighbourhood record
    const neighbourhoodResult = await pool.query(updateNeighbourhoodQuery, [
      neighbourhood,
    ])

    // Update listing releated records
    await pool.query(updateGeoLocationQuery, [
      latitude,
      longitude,
      listing[0].geo_location_id,
    ])

    const propertyTypeResult = await pool.query(addPropertyTypeQuery, [
      property_type,
    ])

    const roomTypeResult = await pool.query(addRoomTypeQuery, [room_type])

    // Update or insert amenities and get their IDs
    const amenityIds = []
    if (amenities && amenities.length > 0) {
      amenities.split(',').forEach(async (amenity) => {
        let amenityId = await pool.query(addAmenityQuery, [amenity.trim()])
        amenityIds.push(amenityId[0].insertId)
      })
    }

    // SQL query to update listing record
    const updateListingQuery = `UPDATE listing
      SET name = ?, description = ?, neighbourhood_overview = ?, accommodates = ?,
      bedrooms = ?, beds = ?, bathrooms_text = ?, availability_365 = ?, price = ?,
      host_id = ?, neighbourhood_id = ?, 
      property_type_id = ?, room_type_id = ?
      WHERE listing_id = ?`

    // Get IDs of the updated records
    const neighbourhood_id =
      neighbourhoodResult[0].insertId || listing[0].neighbourhood_id
    const property_type_id =
      propertyTypeResult[0].insertId || listing[0].property_type_id
    const room_type_id = roomTypeResult[0].insertId || listing[0].room_type_id

    // Update listing record
    await pool.query(updateListingQuery, [
      name,
      description,
      neighbourhood_overview,
      accommodates,
      bedrooms,
      beds,
      bathrooms_text,
      availability_365,
      price,
      host_id,
      neighbourhood_id,
      property_type_id,
      room_type_id,
      listing_id,
    ])

    // Update listing_amenity_junction table
    if (amenityIds.length > 0) {
      const deleteListingAmenityJunctionQuery = `DELETE FROM listing_amenity_junction
                                                 WHERE listing_id = ?`
      await pool.query(deleteListingAmenityJunctionQuery, [listing_id])

      const addListingAmenityJunctionQuery = `INSERT INTO listing_amenity_junction (listing_id, amenity_id)
                                              VALUES (?, ?)`
      for (const amenityId of amenityIds) {
        await pool.query(addListingAmenityJunctionQuery, [
          listing_id,
          amenityId,
        ])
      }
    }

    res.redirect('/listing/' + listing_id)
  } catch (err) {
    console.error(err)
    res.status(500).send('Error updating listing')
  }
})

/**
 * @api {delete} /listing/delete/:id
 * Delete listing
 */
router.post('/listing/delete/:id', async (req, res) => {
  try {
    // SQL query to fetch listing details
    const getListingQuery = `SELECT * FROM listing WHERE listing_id = ? LIMIT 1`
    // Fetch listing details
    const [listing] = await pool.query(getListingQuery, [req.params.id])

    // SQL queries to delete listing and related records
    const deleteListingAmenityJunctionQuery = `DELETE FROM listing_amenity_junction WHERE listing_id = ?`
    await pool.query(deleteListingAmenityJunctionQuery, [req.params.id])

    const deleteListingQuery = `DELETE FROM listing WHERE listing_id = ?`
    await pool.query(deleteListingQuery, [req.params.id])

    const deleteGeoLocationQuery = `DELETE FROM geo_location WHERE geo_location_id = ?`
    await pool.query(deleteGeoLocationQuery, [listing[0].geo_location_id])

    const deleteReviewQuery = `DELETE FROM review WHERE review_id = ?`
    await pool.query(deleteReviewQuery, [listing[0].review_id])

    const deleteListingUrlQuery = `DELETE FROM listing_url WHERE listing_url_id = ?`
    await pool.query(deleteListingUrlQuery, [listing[0].listing_url_id])
    res.redirect('/')
  } catch (err) {
    console.error(err)
    res.status(500).send('Error deleting listing')
  }
})

/**
 * @api {get} /
 * All listings
 */
router.get('/', async (req, res) => {
  try {
    // Pagination variables
    let currPage = parseInt(req.query.currPage) || 1
    let search = req.query.search || ''
    let offset = 18
    let sort = req.query.sort || ''

    let sortQuery = ''
    switch (sort) {
      case 'price_asc':
        sortQuery = 'ORDER BY price ASC'
        break
      case 'price_desc':
        sortQuery = 'ORDER BY price DESC'
        break
      case 'rating_asc':
        sortQuery = 'ORDER BY review_scores_rating ASC'
        break
      case 'rating_desc':
        sortQuery = 'ORDER BY review_scores_rating DESC'
        break
      default:
        sortQuery = ''
    }

    // SQL query to fetch top 5 common amenities
    let topAmenitiesQuery = `SELECT amenity, COUNT(*) AS count FROM listing_amenity_junction
                             INNER JOIN amenity ON
                             listing_amenity_junction.amenity_id = amenity.amenity_id
                             GROUP BY amenity
                             ORDER BY count DESC
                             LIMIT 5`

    const [topAmenities] = await pool.query(topAmenitiesQuery)

    // SQL query to fetch top 5 common neighbourhoods
    let topNeighbourhoodsQuery = `SELECT neighbourhood, COUNT(*) AS count FROM listing
                                  INNER JOIN neighbourhood ON
                                  listing.neighbourhood_id = neighbourhood.neighbourhood_id
                                  GROUP BY neighbourhood
                                  ORDER BY count DESC
                                  LIMIT 5`

    const [topNeighbourhoods] = await pool.query(topNeighbourhoodsQuery)

    // SQL for min, max and avg price
    let minMaxAvgPriceQuery = `SELECT CEIL(MIN(price)) AS min_price,
                               CEIL(MAX(price)) AS max_price,
                               CEIL(AVG(price)) AS avg_price FROM listing`

    const [minMaxAvgPrice] = await pool.query(minMaxAvgPriceQuery)

    // Search where clause for SQL query to fetch listings
    let whereClause = ''
    if (search) {
      whereClause = `WHERE name LIKE '%${search}%' OR neighbourhood LIKE '%${search}%'`
    }

    // SQL query to fetch listings
    let query = `SELECT * FROM listing
                 LEFT JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                 LEFT JOIN neighbourhood ON neighbourhood.neighbourhood_id = listing.neighbourhood_id
                 LEFT JOIN review ON listing.review_id = review.review_id
                 ${whereClause}
                 ${sortQuery}
                 LIMIT ${offset} OFFSET ${(currPage - 1) * offset}`

    // Query to get the total count of records in the `listing` table
    let countQuery = `SELECT COUNT(*) as total FROM listing
                      INNER JOIN neighbourhood ON listing.neighbourhood_id = neighbourhood.neighbourhood_id
                      ${whereClause}`

    const [countResult] = await pool.query(countQuery)
    const totalPages = Math.ceil(countResult[0].total / offset)

    const [result] = await pool.query(query)
    res.render('listings', {
      listings: result,
      search,
      sort,
      topAmenities,
      topNeighbourhoods,
      minMaxAvgPrice: minMaxAvgPrice[0],
      pagination: {
        currPage: currPage,
        perPage: offset,
        totalPages: totalPages,
      },
      pageInfo: { title: 'All listings' },
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('Error fetching listings')
  }
})

/**
 * @api {get} /:id
 * Listing by id
 */
router.get('/listing/:id', async (req, res) => {
  try {
    // SQL query to fetch listing details
    let query = `SELECT listing.*, listing_url.*, host.*, host_url.*, neighbourhood.*, 
                geo_location.*, property_type.*, room_type.*, review.*,
                GROUP_CONCAT(amenity.amenity SEPARATOR ', ') AS amenities
                FROM listing
                LEFT JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                LEFT JOIN host ON listing.host_id = host.host_id
                LEFT JOIN host_url ON host.host_url_id = host_url.host_url_id
                LEFT JOIN neighbourhood ON listing.neighbourhood_id = neighbourhood.neighbourhood_id
                LEFT JOIN geo_location ON listing.geo_location_id = geo_location.geo_location_id
                LEFT JOIN property_type ON listing.property_type_id = property_type.property_type_id
                LEFT JOIN room_type ON listing.room_type_id = room_type.room_type_id
                LEFT JOIN review ON listing.review_id = review.review_id
                LEFT JOIN listing_amenity_junction ON listing.listing_id = listing_amenity_junction.listing_id
                LEFT JOIN amenity ON listing_amenity_junction.amenity_id = amenity.amenity_id
                WHERE listing.listing_id = ?
                GROUP BY listing.listing_id
                LIMIT 1`

    const [result] = await pool.query(query, [req.params.id])
    if (result.length === 0) {
      res.status(404).render('404.ejs', { pageInfo: { title: '404' } })
      return
    }
    res.render('listing-details', {
      listing: result[0],
      pageInfo: { title: 'Listing details' },
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('Error fetching listing details')
  }
})

module.exports = router
