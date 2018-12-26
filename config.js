const config = {
	app: {
		port: 3000
	},
	service: {
		idsToTake: 100,
		delayBetweenRequests: 350 /*350*/,
		delayBetweenErrors: 1000,
		cacheSize: 1000,
	},
	vk: {
		notice: {
			maxUsersIdsCount: 100,
			maxMessageLength: 254,
			maxRequestsRate: /*10000000*/ 3
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
			uri: 'mongodb://localhost:27017/kosmosGamesDB',
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