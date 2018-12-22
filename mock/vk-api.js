const config = require('./../config').vk;

const { maxUsersIdsCount, maxMessageLength, maxRequestsRate } = config.notice;

let requestNumber = 0;
let requestNumberId = '';

function resetRequestNumber(){
	if(requestNumberId == ''){
		requestNumberId = setTimeout(()=>{
			requestNumber = 0;
			requestNumberId = '';
			console.log('reset');
		}, 1000)
	}
};

const VK = {
	async sendNotification(ids = [], text = ''){
		console.log(ids)
		if(requestNumber >= maxRequestsRate) {
			throw new Error('Too frequently');
		}
		if(ids.length > maxUsersIdsCount || text > maxMessageLength) {
			throw new Error('Invalid data');
			return;
		}
		if(false) {
			throw new Error('Server fatal error');
			return;
		}

		requestNumber++;
		resetRequestNumber();

		return ids;
	}
}

module.exports = VK;