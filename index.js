const express = require('express');
const app = express();

app.get('/send', (req, res) => {
	let message = req.query.template;
});

app.listen(3000, () => {
  console.log('Vk notifications service listening on port 3000!');
});