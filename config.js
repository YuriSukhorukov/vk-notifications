const config = {
	app: {
		port: 3000
	},
	mongo: {
		development: {
			host: 'mongodb://localhost:27017/',
			dbname: 'kosmosGamesDB',
		},
		production: {
			host: '',
			dbname: '',
			dbuser: '',
			dbpassword: ''
		}
	},
	winston: {
		file: {
	    level: 'info',
	    filename: `./logs/app.log`,
	    handleExceptions: true,
	    json: false,
	    maxsize: 5242880,
	    maxFiles: 5,
	    colorize: false,
	  },
	  console: {
	    level: 'debug',
	    handleExceptions: true,
	    json: false,
	    colorize: true,
	  },
	}
}

module.exports = config;