let express = require('express');
let VK = require('./mock/vk-api');
let state = require('./modules/state');
let logger = require('./modules/winston');
let repository = require('./modules/repository');
let TimeInterval = require('./modules/time-interval');
const {port} = require('./config').app;
const states = require('./config').states;

let app = express();

// let page = 0;
let nPerPage = 100;
let playersIds = [];
 
let sendingInterval = new TimeInterval(400, 1000);

repository.connect();
state.connect().then(() => {
	state.load().then(res => {
		console.log(res)
		if(state.status == states.SENDING || state.status == states.ERROR){
			notice.state = sending;
			notice.send();
		}
	}).catch(err => {
		state.save({ status: states.IDLE, msg: '', offset: 0 });
	})
})


const idle = {
	async send() {
		console.log('idle');
	}
}

const end = {
	async send() {
		logger.info(`Notification sending complete`);

		// page = 0;
		state.offset = 0;
		await state.save({status: states.IDLE, msg: '', offset: 0 });
	}
}

const clearRecieved = {
	async send(){
		await repository.clearReceivedIds();
		notice.state = processIds;
		notice.send();
	}
}

const processIds = {
	async send () {
		let playersCount = await repository.getPlayersIdsCount();
		// let delta = playersCount - page * nPerPage
		let delta = playersCount - state.offset;

		if(delta <= 0){
			notice.state = end;
			notice.send();
			return;
		}

		let limit = 0;
		if(delta > nPerPage)
			limit = nPerPage;
		else
			limit = delta;

		playersIds.splice(0);
		// playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);
		playersIds = await repository.getPlayersIdsFrom(state.offset, limit);

		console.log('delta', delta, state.offset);
		
		await repository.subtractReceivedFromPlayers(playersIds);

		if(playersIds.length == 0){
			// page++;
			state.offset += nPerPage;
			notice.state = processIds;
			notice.send();
		}else{
			notice.state = sending;
			notice.send();
		}
	}
}

const sending = {
	async send() {
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async () => {
					notice.state = processIds;
					// page++;
					state.offset += nPerPage;
					console.log('SENDED');
					logger.info(`Successful notification for: ${JSON.stringify(response)}`);
					await repository.saveReceivedIds(response);
					await state.save({status: state.status, msg: state.msg, offset: state.offset });
					sendingInterval.fast();
				})()
			}).catch( err => {
				if(err.message == 'Invalid data'){
					notice.state = processIds;
					// page++;
					state.offset += nPerPage;
					logger.error('Invalid data');
					state.save({status: state.status, msg: state.msg, offset: state.offset });
					sendingInterval.slow();
				}else if(err.message == 'Too frequently'){
					notice.state = processIds;
					logger.error('Too frequently');
					sendingInterval.slow();
				}else if(err.message == 'Server fatal error'){
					notice.state = idle;
					state.save({status: states.ERROR, msg: state.msg, offset: state.offset });
					logger.error('Server fatal error');
				}
			})

		setTimeout(()=>{notice.send();}, sendingInterval.time);
	}
}

const notice = {
	state: idle,
	send(){
		this.state.send();
	}
}

// получаем следующие 100 идентификаторов из players
// проверяем, есть ли они в бд идентификаторов, получивших сообщение
// идентификаторы, находящиеся в бд получивших исключаем из списка для отправки
// получаем из бд дополнительные N id для отправки (n - количествово удаленных)
// повторяем проверку
// отправили сообщение
// получили идентификаторы, которым успешно отправили сообщение
// записываем их в бд идентификаторов получивших сообщение
// повторяем цикл
// 
// получаем команду на новую рассылку - коллекция получивших сообщение очищается
// возобновляем работу после падения - коллекция получивших сообщение не очищается

// функция цикличной отправки
// вызывает сама себя
// отправляет запросы не чаще чем N раз в секунду
// отправляет N записей за раз

app.get('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);

	state.save({ status: states.SENDING, msg: message, offset: state.offset});
	
	if(state.status == states.ERROR || states.status == states.SENDING){
		notice.state = sending;
	}
	else
		notice.state = clearRecieved;
	
	notice.send();
});
app.post('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	sendNotification(message, true);
	if(state.status !== states.ERROR)
		sendNotification(message, true);
	else
		sendNotification(message, false);
});

app.listen(port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});