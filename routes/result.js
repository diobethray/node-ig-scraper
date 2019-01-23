var express = require('express');
var router = express.Router();
var axios = require('axios');
var createError = require('http-errors');

var scraper = require('../lib/actions/scrape');

/* POST result page. */
router.post('/', function(req, res, next) {
  if (!req.body.ig_handle) {
    next(createError(400, 'Instagram handle is required.'));
  } else {
    scraper.scrapeUserPage(req.body.ig_handle)
      .then(function(result){
        res.render('result', result);
      })
      .catch(function(error){
        next(createError(400, 'Please check your Instagram Handle "'+ req.body.ig_handle +'"'));
      });
  }
});

module.exports = router;
