let winston = require('winston');
let config = require('./../config.js');

let logger = winston.createLogger({
  format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(info => {
          return `${info.timestamp} ${info.level}: ${info.message}`;
      })
  ),
  transports: [
  	new winston.transports.Console(),
  	new winston.transports.File(config.winston.file)
  ]
});

module.exports = logger;