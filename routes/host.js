const express = require('express')
const router = express.Router()
const pool = require('../dbconnection')

/**
 * @api {get} / Add new host
 */
router.get('/add-host', async (req, res) => {
  res.render('add-host', {
    pageInfo: { title: 'Add new host' },
  })
})

/**
 * @api {post} / Add new host
 */
router.post('/add-host', async (req, res) => {
  try {
    const {
      host_name,
      host_about,
      host_neighbourhood,
      host_picture_url,
      host_location,
    } = req.body

    // As we don't have a form field for host_url which is a link to the host's profile on Airbnb,
    // we'll hardcode it to a default value
    const host_url = 'https://www.airbnb.co.in'

    const addHostUrlQuery = `INSERT INTO host_url (host_url, host_picture_url) VALUES (?, ?)`
    const addHostNeighbourhoodQuery = `INSERT INTO host_neighbourhood (host_neighbourhood)
                                       VALUES (?)
                                       ON DUPLICATE KEY UPDATE host_neighbourhood = VALUES(host_neighbourhood),
                                       host_neighbourhood_id = LAST_INSERT_ID(host_neighbourhood_id)`
    const addHostLocationQuery = `
      INSERT INTO host_location (host_location)
      VALUES (?)
      ON DUPLICATE KEY UPDATE host_location = VALUES(host_location),
      host_location_id = LAST_INSERT_ID(host_location_id)`

    // Execute the host_url query using async/await
    const urlResult = await pool.query(addHostUrlQuery, [
      host_url,
      host_picture_url,
    ])
    const host_url_id = urlResult[0].insertId

    // Execute the host_neighbourhood query using async/await
    const neighbourhoodResult = await pool.query(addHostNeighbourhoodQuery, [
      host_neighbourhood,
    ])
    const host_neighbourhood_id = neighbourhoodResult[0].insertId

    // Execute the host_location query using async/await
    const locationResult = await pool.query(addHostLocationQuery, [
      host_location,
    ])
    const host_location_id = locationResult[0].insertId

    // Insert the new host into the host table using async/await
    const insertHostQuery = `INSERT INTO host (host_name, host_about, host_total_listings_count,
    host_url_id,host_neighbourhood_id, host_location_id) VALUES (?, ?, ?, ?, ?, ?)`
    const result = await pool.query(insertHostQuery, [
      host_name,
      host_about,
      0,
      host_url_id,
      host_neighbourhood_id,
      host_location_id,
    ])

    const newHostId = result[0].insertId
    console.log('New host ID:', newHostId)
    res.redirect('/host/' + newHostId)
  } catch (err) {
    console.error('Error adding host:', err)
    res.status(500).send('Error adding host')
  }
})

/**
 * @api {post} / Edit host
 * Edit host
 */

router.post('/edit/:id', async (req, res) => {
  try {
    const {
      host_name,
      host_about,
      host_neighbourhood,
      host_picture_url,
      host_location,
    } = req.body

    // As we don't have a form field for host_url which is a link to the host's profile on Airbnb,
    // we'll hardcode it to a default value
    const host_url = 'https://www.airbnb.co.in'

    const updateHostUrlQuery = `UPDATE host_url SET host_url = ?, host_picture_url = ? WHERE host_url_id = ?`
    const addHostNeighbourhoodQuery = `INSERT INTO host_neighbourhood (host_neighbourhood)
                                       VALUES (?)
                                       ON DUPLICATE KEY UPDATE host_neighbourhood = VALUES(host_neighbourhood),
                                       host_neighbourhood_id = LAST_INSERT_ID(host_neighbourhood_id)`
    const addHostLocationQuery = `
      INSERT INTO host_location (host_location)
      VALUES (?)
      ON DUPLICATE KEY UPDATE host_location = VALUES(host_location),
      host_location_id = LAST_INSERT_ID(host_location_id)`

    const host_id = req.params.id
    const [host] = await pool.query('SELECT * FROM host WHERE host_id = ?', [
      host_id,
    ])

    // Execute the host_url query using async/await
    const urlResult = await pool.query(updateHostUrlQuery, [
      host_url,
      host_picture_url,
      host[0].host_url_id,
    ])

    const host_url_id = urlResult[0].insertId

    // Execute the host_neighbourhood query using async/await
    const neighbourhoodResult = await pool.query(addHostNeighbourhoodQuery, [
      host_neighbourhood,
    ])
    const host_neighbourhood_id = neighbourhoodResult[0].insertId

    // Execute the host_location query using async/await
    const locationResult = await pool.query(addHostLocationQuery, [
      host_location,
    ])
    const host_location_id = locationResult[0].insertId

    // Update the new host into the host table using async/await
    const updateHostQuery = `UPDATE host SET host_name = ?, host_about = ?,
    host_url_id = ?, host_neighbourhood_id = ?, host_location_id = ? WHERE host_id = ?`
    const result = await pool.query(insertHostQuery, [
      host_name,
      host_about,
      host_url_id,
      host_neighbourhood_id,
      host_location_id,
      host_id,
    ])

    const newHostId = result[0].insertId
    console.log('New host ID:', newHostId)
    res.redirect('/host/' + newHostId)
  } catch (err) {
    console.error('Error editing host:', err)
    res.status(500).send('Error editing host')
  }
})

/**
 * @api {post} /host/delete/:id
 * Delete host
 */
router.post('/delete/:id', async (req, res) => {
  try {
    const host_id = req.params.id

    const getListingsQuery = `SELECT listing_id FROM listing WHERE host_id = ?`
    const [listings] = await pool.query(getListingsQuery, [host_id])

    const getListingQuery = `SELECT * FROM listing WHERE listing_id = ? LIMIT 1`
    const deleteListingAmenityJunctionQuery = `DELETE FROM listing_amenity_junction WHERE listing_id = ?`
    const deleteListingQuery = `DELETE FROM listing WHERE listing_id = ?`
    const deleteGeoLocationQuery = `DELETE FROM geo_location WHERE geo_location_id = ?`
    const deleteReviewQuery = `DELETE FROM review WHERE review_id = ?`
    const deleteListingUrlQuery = `DELETE FROM listing_url WHERE listing_url_id = ?`

    // Delete the listings
    listings.forEach(async (listing) => {
      const [currListing] = await pool.query(getListingQuery, [
        listing.listing_id,
      ])
      await pool.query(deleteListingAmenityJunctionQuery, [
        currListing[0].listing_id,
      ])
      await pool.query(deleteListingQuery, [currListing[0].listing_id])
      await pool.query(deleteGeoLocationQuery, [currListing[0].geo_location_id])
      await pool.query(deleteReviewQuery, [currListing[0].review_id])
      await pool.query(deleteListingUrlQuery, [currListing[0].listing_url_id])
    })

    const deleteHostUrlQuery = `DELETE FROM host_url WHERE host_url_id = ?`
    const deleteHostNeighbourhoodQuery = `DELETE FROM host_neighbourhood WHERE host_neighbourhood_id = ?`
    const deleteHostLocationQuery = `DELETE FROM host_location WHERE host_location_id = ?`
    const deleteHostQuery = `DELETE FROM host WHERE host_id = ?`
    await pool.query(deleteHostUrlQuery, [host_id])
    await pool.query(deleteHostNeighbourhoodQuery, [host_id])
    await pool.query(deleteHostLocationQuery, [host_id])
    await pool.query(deleteHostQuery, [host_id])
    res.redirect('/')
  } catch (err) {
    console.error('Error deleting host:', err)
    res.status(500).send('Error deleting host')
  }
})

/**
 * @api {get} /host/edit/:id
 * Edit host
 */
router.get('/edit/:id', async (req, res) => {
  try {
    const host_id = req.params.id
    const query = `SELECT host.*, host_url.*, host_location.*, host_neighbourhood.*,
                   GROUP_CONCAT(DISTINCT listing.listing_id SEPARATOR ', ') AS listings,
                   GROUP_CONCAT(DISTINCT listing.name SEPARATOR ', ') AS listing_names,
                   GROUP_CONCAT(DISTINCT listing_url.listing_url SEPARATOR ', ') AS listing_urls
                   FROM host
                   LEFT JOIN host_url ON host.host_url_id = host_url.host_url_id
                   LEFT JOIN host_location ON host.host_location_id = host_location.host_location_id
                   LEFT JOIN host_neighbourhood ON host.host_neighbourhood_id = host_neighbourhood.host_neighbourhood_id
                   LEFT JOIN listing ON host.host_id = listing.host_id
                   LEFT JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                   WHERE host.host_id = ?
                   GROUP BY host.host_id
                   LIMIT 1`

    const [result] = await pool.query(query, [host_id])
    const hostData = result[0]

    // Create the array of objects
    const hostListings = []
    if (hostData.listings && hostData.listing_names && hostData.listing_urls) {
      // Split the concatenated strings into arrays
      const listingsArray = hostData.listings.split(', ') || []
      const listingNamesArray = hostData.listing_names.split(', ') || []
      const listingUrlsArray = hostData.listing_urls.split(', ') || []

      // Loop through the arrays and create objects with the respective values
      for (let i = 0; i < listingsArray.length; i++) {
        const listingObj = {
          listing_id: parseInt(listingsArray[i]),
          name: listingNamesArray[i],
          listing_url: listingUrlsArray[i],
        }
        hostListings.push(listingObj)
      }
    }

    const [host_locations] = await pool.query('SELECT * FROM host_location')
    const [host_neighbourhoods] = await pool.query(
      'SELECT * FROM host_neighbourhood'
    )

    res.render('edit-host', {
      host_locations: host_locations,
      host_neighbourhoods: host_neighbourhoods,
      host: hostData,
      pageInfo: { title: 'Edit host' },
    })
  } catch (err) {
    console.error('Error fetching host details:', err)
    res.status(500).send('Error fetching host details')
  }
})

/**
 * @api {get} / Host
 */
router.get('/:id', async (req, res) => {
  try {
    const host_id = req.params.id
    const query = `SELECT host.*, host_url.*, host_location.*, host_neighbourhood.*,
                   GROUP_CONCAT(DISTINCT listing.listing_id SEPARATOR ', ') AS listings,
                   GROUP_CONCAT(DISTINCT listing.name SEPARATOR ', ') AS listing_names,
                   GROUP_CONCAT(DISTINCT listing_url.listing_url SEPARATOR ', ') AS listing_urls
                   FROM host
                   LEFT JOIN host_url ON host.host_url_id = host_url.host_url_id
                   LEFT JOIN host_location ON host.host_location_id = host_location.host_location_id
                   LEFT JOIN host_neighbourhood ON host.host_neighbourhood_id = host_neighbourhood.host_neighbourhood_id
                   LEFT JOIN listing ON host.host_id = listing.host_id
                   LEFT JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
                   WHERE host.host_id = ?
                   GROUP BY host.host_id
                   LIMIT 1`

    const [result] = await pool.query(query, [host_id])
    const hostData = result[0]

    // Create the array of objects
    const hostListings = []
    if (hostData.listings && hostData.listing_names && hostData.listing_urls) {
      // Split the concatenated strings into arrays
      const listingsArray = hostData.listings.split(', ') || []
      const listingNamesArray = hostData.listing_names.split(', ') || []
      const listingUrlsArray = hostData.listing_urls.split(', ') || []

      // Loop through the arrays and create objects with the respective values
      for (let i = 0; i < listingsArray.length; i++) {
        const listingObj = {
          listing_id: parseInt(listingsArray[i]),
          name: listingNamesArray[i],
          listing_url: listingUrlsArray[i],
        }
        hostListings.push(listingObj)
      }
    }

    delete hostData.listings
    delete hostData.listing_names
    delete hostData.listing_urls
    res.render('host', {
      host: hostData,
      listings: hostListings,
      pageInfo: { title: 'Host details' },
    })
  } catch (err) {
    console.error('Error fetching host details:', err)
    res.status(500).send('Error fetching host details')
  }
})

module.exports = router
