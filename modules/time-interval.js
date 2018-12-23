class SendingInterval {
	constructor(minTime, maxTime){
		this._time = 0;
		this._minTime = minTime;
		this._maxTime = maxTime;
	}
	get time(){
		return this._time;
	}
	fast(){
		this._time = this._minTime;
	}
	slow(){
		this._time = this._maxTime;
	}
}

module.exports = SendingInterval