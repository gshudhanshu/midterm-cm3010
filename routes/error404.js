// All the code is written by myself

const express = require('express')
const router = express.Router()

/**
 * @api {get} /*
 * Error 404
 */
router.get('/*', async (req, res) => {
  res.status(404).render('404.ejs', { pageInfo: { title: '404' } })
})

module.exports = router
