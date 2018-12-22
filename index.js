let express = require('express');
let config = require('./config');
let logger = require('./modules/winston');
let mongo = require('./modules/mongo')
let VK = require('./mock/vk-api');
let app = express();

app.get('/send', (req, res) => {
	let message = req.query.template;

	mongo.getIds('players').then(ids=>{
		VK.sendNotification(ids, message)
			.then(res=>{
				logger.info(`successful notification for: ${JSON.stringify(res)}`)
			})
			.catch(error=>{
				logger.error(error)
			});
	})
});
app.post('/send', (req, res) => {
	let message = req.query.template;
});

app.listen(config.port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});