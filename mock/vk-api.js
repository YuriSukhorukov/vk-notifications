const { 
	maxUsersIdsCount, 
	maxMessageLength, 
	maxRequestsRate } = require('./../config').vk.notice;

let requestNumber = 0;
let requestNumberId = '';

function resetRequestNumber(){
	if(requestNumberId == ''){
		requestNumberId = setTimeout(()=>{
			requestNumber = 0;
			requestNumberId = '';
		}, 1000)
	}
};

const VK = {
	async sendNotification(ids = [], text = ''){
		if(ids.length > maxUsersIdsCount || text > maxMessageLength || 
			ids.length == 0 || text.length == 0)
			throw new Error('Invalid data');
		if(requestNumber > maxRequestsRate)
			throw new Error('Too frequently');
		if(false)
			throw new Error('Server fatal error');

		let response = ids.map(element=>{
			return { id: element.id };
		})

		requestNumber++;
		resetRequestNumber();

		return response;
	}
}

module.exports = VK;