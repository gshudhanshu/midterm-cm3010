const express = require('express')
const router = express.Router()
const getBlogSettings = require('../utils/utilFunctions')

/**
 * @api {get} / Error 404
 */
router.get('/*', async (req, res) => {
  const blog_settings = await getBlogSettings()
  res.status(404).render('error-pages/404.ejs', { blog_settings })
})

module.exports = router
