const express = require('express')
const router = express.Router()

/**
 * @api {get} / Error 404
 */
router.get('/*', async (req, res) => {
  res.status(404).render('404.ejs')
})

module.exports = router
