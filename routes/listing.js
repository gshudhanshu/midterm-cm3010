const express = require('express')
const router = express.Router()
const pool = require('../dbconnection')

/**
 * @api {get} /listing/add-listing
 * Add new listing
 */
router.get('/listing/add-listing', async (req, res) => {
  console.log('test')
  try {
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
  const {
    name,
    description,
    neighborhood_overview,
    amenities,
    accommodates,
    bedrooms,
    beds,
    latitude,
    longitude,
    bathrooms,
    room_type,
    property_type,
    availability_365,
    picture_url,
    price,
    host_id,
  } = req.body

  // As we don't have listing_url as it is a link to the listing on Airbnb,
  // we'll hardcode it to a default value
  const listing_url = 'https://www.airbnb.co.in'

  const addListingUrlQuery = `INSERT INTO listing_url (listing_url, picture_url
    ) VALUES (?, ?)`
  const addNeighborhoodQuery = `INSERT INTO neighborhood (neighborhood) VALUES (?)`
  const addGeoLocationQuery = ` INSERT INTO geo_location (latitude, longitude) VALUES (?, ?)`
  const addPropertyTypeQuery = `INSERT INTO property_type (property_type) VALUES (?)`
  const addRoomTypeQuery = `INSERT INTO room_type (room_type) VALUES (?)`
  const addAmenityQuery = `INSERT INTO amenity (amenity) VALUES (?)`
  const addReviewQuery = `INSERT INTO review
                          (number_of_reviews, review_scores_rating)
                          VALUES (?, ?)`

  const listingUrlResult = await pool.query(addListingUrlQuery, [
    listing_url,
    picture_url,
  ])
  const neighborhoodResult = await pool.query(addNeighborhoodQuery, [
    neighborhood,
  ])
  const geoLocationResult = await pool.query(addGeoLocationQuery, [
    latitude,
    longitude,
  ])
  const propertyTypeResult = await pool.query(addPropertyTypeQuery, [
    property_type,
  ])
  const roomTypeResult = await pool.query(addRoomTypeQuery, [room_type])
  const amenityResult = await pool.query(addAmenityQuery, [amenities])
  const reviewResult = await pool.query(addReviewQuery, [
    number_of_reviews,
    review_scores_rating,
  ])

  // After inserting foreign table values, we can now insert into the listing table
  const addListingQuery =
    'INSERT INTO listing (name, description, neighborhood_overview, amenities, accommodates, bedrooms, beds, latitude, longitude, bathrooms, room_type_id, property_type_id, availability_365, picture_url, price, listing_url_id, host_id, neighborhood_id, geo_location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  const [listingResult] = await pool.query(addListingQuery, [
    name,
    description,
    neighborhood_overview,
    amenities,
    accommodates,
    bedrooms,
    beds,
    latitude,
    longitude,
    bathrooms,
    room_type,
    property_type,
    availability_365,
    picture_url,
    price,
    host_url_id,
    host_url_id,
    host_location_id,
    host_location_id,
  ])

  // Assuming you have a success page, you can redirect to it
  res.redirect('/listing/' + listingResult[0].insertId)
})

/**
 * @api {get} /
 * All listings
 */
router.get('/', async (req, res) => {
  try {
    let currPage = parseInt(req.query.currPage) || 1
    let search = req.query.search || ''
    let offset = 15

    // Search where clause
    let whereClause = ''
    if (search) {
      whereClause = `WHERE name LIKE '%${search}%' OR neighborhood LIKE '%${search}%'`
    }

    let query = `SELECT * FROM listing
                 INNER JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                 INNER JOIN neighborhood ON neighborhood.neighborhood_id = listing.neighborhood_id
                 ${whereClause}
                 LIMIT ${offset} OFFSET ${(currPage - 1) * offset}`

    // Query to get the total count of records in the `listing` table
    let countQuery = `SELECT COUNT(*) as total FROM listing
                      INNER JOIN neighborhood ON listing.neighborhood_id = neighborhood.neighborhood_id
                      ${whereClause}`

    const [countResult] = await pool.query(countQuery)
    const totalPages = Math.ceil(countResult[0].total / offset)
    console.log(totalPages)

    const [result] = await pool.query(query)
    res.render('listings', {
      listings: result,
      search,
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
    let query = `SELECT listing.*, listing_url.*, host.*, host_url.*, neighborhood.*, 
                geo_location.*, property_type.*, room_type.*, review.*,
                GROUP_CONCAT(amenity.amenity SEPARATOR ', ') AS amenities
                FROM listing
                INNER JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                INNER JOIN host ON listing.host_id = host.host_id
                INNER JOIN host_url ON host.host_url_id = host_url.host_url_id
                INNER JOIN neighborhood ON listing.neighborhood_id = neighborhood.neighborhood_id
                INNER JOIN geo_location ON listing.geo_location_id = geo_location.geo_location_id
                INNER JOIN property_type ON listing.property_type_id = property_type.property_type_id
                INNER JOIN room_type ON listing.room_type_id = room_type.room_type_id
                INNER JOIN review ON listing.review_id = review.review_id
                INNER JOIN listing_amenity_junction ON listing.listing_id = listing_amenity_junction.listing_id
                INNER JOIN amenity ON listing_amenity_junction.amenity_id = amenity.amenity_id
                WHERE listing.listing_id = ?
                GROUP BY listing.listing_id
                LIMIT 1`

    const [result] = await pool.query(query, [req.params.id])
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
