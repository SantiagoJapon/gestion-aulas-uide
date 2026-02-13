const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { verificarAuth } = require('../middleware/auth');

router.get('/global', verificarAuth, searchController.globalSearch);
router.get('/disponibilidad', verificarAuth, searchController.searchAvailability);

module.exports = router;
