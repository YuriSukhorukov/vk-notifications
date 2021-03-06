const config = {
	app: {
		port: 3000
	},
	service: {
		idsToTake: 100,
		delayBetweenRequests: 350,
		delayBetweenErrors: 1000,
	},
	repository: {
		cacheSize: 1000,
		cacheMemory: 5242880,
	},
	vk: {
		notice: {
			maxUsersIdsCount: 100,
			maxMessageLength: 254,
			maxRequestsRate: 3,
		}
	},
	statuses: {
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