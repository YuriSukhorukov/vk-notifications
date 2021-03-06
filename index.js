let express = require('express');
let logger = require('./modules/logger');
const sender = require('./modules/notice-sender/index');
const { port } = require('./config').app;

let app = express();

sender.setState(sender.states.initializeState);
sender.action();

app.get('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);

	sender.setMessage(message);
	sender.setState(sender.states.processRequestState);
	sender.action();

	res.send('Notification request received.');
});
app.post('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);

	sender.setMessage(message);
	sender.setState(sender.states.processRequestState);
	sender.action();

	res.send('Notification request received.');
});

app.listen(port, () => {
  logger.info(`Vk notifications service listening on port ${port}!`);
});