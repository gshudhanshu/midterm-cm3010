const express = require('express')
const router = express.Router()
const pool = require('../dbconnection')

/**
 * @api {get} / All listings
 */
router.get('/', async (req, res) => {
  let query = 'SELECT * FROM listing'
  pool.query(query, (err, result) => {
    if (err) throw err
    console.log(result)
    // res.render('listings', { listings: result })
  })
})

module.exports = router
