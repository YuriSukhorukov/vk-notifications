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
let delayBetweenRequests = 350;
let delayBetweenErrors = 1000;
 
let sendingInterval = new TimeInterval(delayBetweenRequests, delayBetweenErrors);

repository.connect();
state.connect().then(() => {
	state.load().then(res => {
		console.log(res)
		if(state.status == states.SENDING || state.status == states.ERROR){
			sender.setState(sendingState);
			sender.action();
		}
	}).catch(err => {
		state.save({ status: states.IDLE, msg: '', offset: 0 });
	})
})

const stateIdle = {
	async action() {
		console.log('idle');
	}
}

// Состояние завершения рассылки
const stateEnd = {
	async action() {
		logger.info(`Notification sending complete`);

		await repository.disconnect();
		state.offset = 0;
		await state.save({status: states.IDLE, msg: '', offset: 0 });
	}
}

// Состяние подключения
const stateConnect = {
	async action (){
		await repository.connect();
		sender.setState(cleaningState);
		sender.action();
	}
}

// Состояние очистки списка получивших уведомление, переход в это 
// состояние при запросе на новую рассылку
const cleaningState = {
	async action(){
		await repository.clearReceivedIds();
		sender.setState(processingStates);
		sender.action();
	}
}

// Состояние работы с идентификаторами, получение части идентификаторов 
// из players ids, проверка на конец коллекции, сравнение полученных id 
// с теми, что в коллекции получивших.
const processingStates = {
	async action () {
		let playersCount = await repository.getPlayersIdsCount();
		let delta = playersCount - state.offset;

		if(delta <= 0){
			sender.setState(stateEnd);
			sender.action();
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
			sender.setState(processingStates);
			sender.action();
		}else{
			sender.setState(sendingState);
			sender.action();
		}
	}
}

// Состояние отправки, взаимоействие с методом-заглушкой сервиса vk, обработка 
// исключений, сохранение текущего состояния, переход на следующую итерацию.
const sendingState = {
	async action() {
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async () => {
					state.offset += nPerPage;
					sender.setState(processingStates);
					console.log('SENDED');
					logger.info(`Successful notification for: ${JSON.stringify(response)}`);
					await repository.saveReceivedIds(response);
					await state.save({status: state.status, msg: state.msg, offset: state.offset });
					sendingInterval.fast();
				})()
			}).catch( err => {
				if(err.message == 'Invalid data'){
					sender.setState(processingStates);
					logger.error('Invalid data');
					state.save({status: state.status, msg: state.msg, offset: state.offset });
					sendingInterval.slow();
				}else if(err.message == 'Too frequently'){
					sender.setState(processingStates);
					logger.error('Too frequently');
					sendingInterval.slow();
				}else if(err.message == 'Server fatal error'){
					sender.setState(stateIdle);
					state.save({status: states.ERROR, msg: state.msg, offset: state.offset });
					logger.error('Server fatal error');
				}
			})

		setImmediate(()=>{
			timoutID = setTimeout(()=>{ sender.action(); clearTimeout(timoutID); }, sendingInterval.time);
		})
	}
}

let timoutID;

// Главный объект :)
const sender = {
	state: stateIdle,
	async action () {
		this.state.action();
	},

	setState (state) {
		this.state = state
	}
}

app.get('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	state.save({ status: states.SENDING, msg: message, offset: state.offset});

	if(state.status == states.ERROR || states.status == states.SENDING)
		sender.setState(processingStates);
	else
		sender.setState(stateConnect);
	
	sender.action();

	res.send('Notification request received.');
});
app.post('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	state.save({ status: states.SENDING, msg: message, offset: state.offset});

	if(state.status == states.ERROR || states.status == states.SENDING)
		sender.setState(processingStates);
	else
		sender.setState(stateConnect);
	
	sender.action();

	res.send('Notification request received.');
});

app.listen(port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});