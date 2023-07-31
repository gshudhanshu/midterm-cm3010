const express = require('express')
const router = express.Router()

/**
 * @api {get} / Host
 */
router.get('/', async (req, res) => {
  res.render('host')
})

module.exports = router
