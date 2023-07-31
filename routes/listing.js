const express = require('express')
const router = express.Router()
const pool = require('../dbconnection')

/**
 * @api {get} / All listings
 */
router.get('/', async (req, res) => {
  let currPage = parseInt(req.query.currPage) || 1
  let offset = 15
  let query = `SELECT * FROM listing
   INNER JOIN listing_url ON listing.listing_url_id = listing_url.listing_url_id
   LIMIT ${offset} OFFSET ${(currPage - 1) * offset}`

  // Query to get the total count of records in the `listing` table
  let countQuery = `SELECT COUNT(*) as total FROM listing`

  pool.query(countQuery, (err, countResult) => {
    if (err) throw err
    const totalPages = Math.ceil(countResult[0].total / offset)
    console.log(totalPages)
    pool.query(query, (err, result) => {
      if (err) throw err
      res.render('listings', {
        listings: result,
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
  let query = 'SELECT * FROM listing WHERE listing_id = ?'
  pool.query(query, [req.params.id], (err, result) => {
    if (err) throw err
    res.render('listing-details', { listing: result[0] })
  })
})

module.exports = router
