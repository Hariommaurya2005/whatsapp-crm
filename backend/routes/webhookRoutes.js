const express = require('express');
const router = express.Router();
const { verifyWebhook, receiveMessage } = require('../controllers/webhookController');

router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', receiveMessage);

module.exports = router;
