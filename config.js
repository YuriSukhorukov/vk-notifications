const config = {
	app: {
		port: 3000
	},
	vk: {
		notice: {
			maxUsersIdsCount: 100,
			maxMessageLength: 254,
			maxRequestsRate: 3
		}
	},
	states: {
		SENDING: 'SENDING',
		IDLE: 'IDLE',
		ERROR: 'ERROR',
	},
	mongo: {
		development: {
			uri: 'mongodb://localhost:27017/kosmosGamesDB',
		},
		production: {
			uri: '',
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