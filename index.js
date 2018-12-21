let express = require('express');
let config = require('./config');
let logger = require('./modules/winston.js');
let VK = require('./mock/vk-api');
let app = express();

app.get('/send', (req, res) => {
	let message = req.query.template;
});
app.post('/send', (req, res) => {
	let message = req.query.template;
});

app.listen(config.port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});