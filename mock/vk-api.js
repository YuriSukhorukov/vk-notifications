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
		if(requestNumber >= maxRequestsRate) {
			// console.error('Too frequently');
			return;
		}
		if(ids.length > maxUsersIdsCount || text > maxMessageLength) {
			// console.error('Invalid data');
			return;
		}
		if(false) {
			// console.error('Server fatal error');
			return;
		}

		requestNumber++;
		resetRequestNumber();

		let response = [{id:''}, {id:''}, {id:''}];
		return response;
	}
}

module.exports = VK;