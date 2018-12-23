let express = require('express');
let VK = require('./mock/vk-api');
let state = require('./modules/state');
let logger = require('./modules/winston');
let repository = require('./modules/repository');
let TimeInterval = require('./modules/time-interval');
const {port} = require('./config').app;
const states = require('./config').states;

let app = express();

let nPerPage = 100;
let playersIds = [];
 
let sendingInterval = new TimeInterval(350, 1000);

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

// "Тупиковое" состояние, из которого нельзя выйти без вмешательства
const idle = {
	async send() {
		console.log('idle');
	}
}

// Состояние завершения рассылки
const end = {
	async send() {
		logger.info(`Notification sending complete`);

		await repository.disconnect();
		state.offset = 0;
		await state.save({status: states.IDLE, msg: '', offset: 0 });
	}
}

const connect = {
	async send (){
		await repository.connect();
		notice.state = clearRecieved;
		notice.send();
	}
}

// Состояние очистки списка получивших уведомление, переход в это 
// состояние при запросе на новую рассылку
const clearRecieved = {
	async send(){
		await repository.clearReceivedIds();
		notice.state = processIds;
		notice.send();
	}
}

// Состояние работы с идентификаторами, получение части идентификаторов 
// из players ids, проверка на конец коллекции, сравнение полученных id 
// с теми, что в коллекции получивших.
const processIds = {
	async send () {
		let playersCount = await repository.getPlayersIdsCount();
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
		playersIds = await repository.getPlayersIdsFrom(state.offset, limit);

		console.log('delta', delta, state.offset);
		
		// удаление из списка id игроков тех id, которые получили уедомление
		// можно выключить, все равно при сохранении состояния сохраняется
		// offset коллекции players
		await repository.subtractReceivedFromPlayers(playersIds);

		// если в загруженной части players id все находятся в списке 
		// полуивших, остаемся в нынешнем состоянии, иначе переходим к рассылке
		if(playersIds.length == 0){
			state.offset += nPerPage;
			notice.state = processIds;
			notice.send();
		}else{
			notice.state = sending;
			notice.send();
		}
	}
}

// Состояние отправки, взаимоействие с методом-заглушкой сервиса vk, обработка 
// исключений, сохранение текущего состояния, переход на следующую итерацию.
const sending = {
	async send() {
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async () => {
					notice.state = processIds;
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

			setImmediate(()=>{
				timoutID = setTimeout(()=>{ notice.send(); clearTimeout(timoutID); }, sendingInterval.time);
			})
	}
}

let timoutID;

// Главный объект :)
const notice = {
	state: idle,
	send(){
		this.state.send();
	}
}

app.get('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	state.save({ status: states.SENDING, msg: message, offset: state.offset});

	if(state.status == states.ERROR || states.status == states.SENDING)
		notice.state = processIds;
	else
		notice.state = connect;
	
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