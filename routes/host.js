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
  const {
    host_name,
    host_about,
    host_neighbourhood,
    host_picture_url,
    host_location,
  } = req.body

  const addHostUrlQuery = `INSERT INTO host_url (host_url, host_picture_url) VALUES (?, ?)`
  const addHostLocationQuery = `
  INSERT INTO host_location (host_location)
  VALUES (?)
  ON DUPLICATE KEY UPDATE
  host_location_id = LAST_INSERT_ID(host_location_id), host_location = VALUES(host_location)`

  // As we don't have a form field for host_url which is a link to the host's profile on Airbnb,
  // we'll hardcode it to a default value
  host_url = 'https://www.airbnb.co.in'

  pool.query(
    addHostUrlQuery,

    [host_url, host_picture_url],
    (err, urlResult) => {
      if (err) throw err
      pool.query(
        addHostLocationQuery,
        [host_location],
        (err, locationResult) => {
          if (err) throw err
          const host_url_id = urlResult.insertId
          const host_location_id = locationResult.insertId
          const query = `INSERT INTO host
                           (host_name, host_about, host_neighbourhood, host_total_listings_count,
                           host_url_id, host_location_id) 
                           VALUES (?, ?, ?, ?, ?, ?)`
          pool.query(
            query,
            [
              host_name,
              host_about,
              host_neighbourhood,
              0,
              host_url_id,
              host_location_id,
            ],
            (err, result) => {
              if (err) throw err
              const newHostId = result.insertId
              res.redirect('/host/' + newHostId)
            }
          )
        }
      )
    }
  )

  res.render('add-host', {
    pageInfo: { title: 'Add new host' },
  })
})

/**
 * @api {get} / Host
 */
router.get('/:id', async (req, res) => {
  let host_id = req.params.id
  let query = `SELECT host.*, host_url.*, host_location.*, 
              GROUP_CONCAT(DISTINCT listing.listing_id SEPARATOR ', ') AS listings,
              GROUP_CONCAT(DISTINCT listing.name SEPARATOR ', ') AS listing_names,
              GROUP_CONCAT(DISTINCT listing_url.listing_url SEPARATOR ', ') AS listing_urls
              FROM host
              INNER JOIN host_url ON host.host_url_id = host_url.host_url_id
              INNER JOIN host_location ON host.host_location_id = host_location.host_location_id
              INNER JOIN listing ON host.host_id = listing.host_id
              INNER JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
              WHERE host.host_id = ?
              GROUP BY host.host_id
              LIMIT 1`

  pool.query(query, [host_id], (err, result) => {
    if (err) throw err

    const hostData = result[0]

    // Create the array of objects
    const hostListings = []

    // Split the concatenated strings into arrays
    const listingsArray = hostData.listings.split(', ')
    const listingNamesArray = hostData.listing_names.split(', ')
    const listingUrlsArray = hostData.listing_urls.split(', ')

    // Loop through the arrays and create objects with the respective values
    for (let i = 0; i < listingsArray.length; i++) {
      const listingObj = {
        listing_id: parseInt(listingsArray[i]),
        name: listingNamesArray[i],
        listing_url: listingUrlsArray[i],
      }
      hostListings.push(listingObj)
    }
    delete hostData.listings
    delete hostData.listing_names
    delete hostData.listing_urls
    res.render('host', {
      host: hostData,
      listings: hostListings,
      pageInfo: { title: 'Host details' },
    })
  })
})

module.exports = router
