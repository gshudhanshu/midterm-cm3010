const express = require('express')
const router = express.Router()
const pool = require('../dbconnection')

/**
 * @api {get} / All listings
 */
router.get('/', async (req, res) => {
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

  pool.query(countQuery, (err, countResult) => {
    if (err) throw err
    const totalPages = Math.ceil(countResult[0].total / offset)
    console.log(totalPages)
    pool.query(query, (err, result) => {
      if (err) throw err
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
    })
  })
})

/**
 * @api {get} /:id Listing by id
 */
router.get('/listing/:id', async (req, res) => {
  let query = `SELECT listing.*, listing_url.*, host.*, host_url.*, neighborhood.*, 
              geo_location.*, property_type.*, room_type.*, 
              GROUP_CONCAT(amenity.amenity SEPARATOR ', ') AS amenities
              FROM listing
              INNER JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
              INNER JOIN host ON listing.host_id = host.host_id
              INNER JOIN host_url ON host.host_url_id = host_url.host_url_id
              INNER JOIN neighborhood ON listing.neighborhood_id = neighborhood.neighborhood_id
              INNER JOIN geo_location ON listing.geo_location_id = geo_location.geo_location_id
              INNER JOIN property_type ON listing.property_type_id = property_type.property_type_id
              INNER JOIN room_type ON listing.room_type_id = room_type.room_type_id
              INNER JOIN listing_amenity_junction ON listing.listing_id = listing_amenity_junction.listing_id
              INNER JOIN amenity ON listing_amenity_junction.amenity_id = amenity.amenity_id
              WHERE listing.listing_id = ?
              GROUP BY listing.listing_id
              LIMIT 1`
  pool.query(query, [req.params.id], (err, result) => {
    if (err) throw err
    console.log(result[0])
    res.render('listing-details', {
      listing: result[0],
      pageInfo: { title: 'Listing details' },
    })
  })
})

module.exports = router
