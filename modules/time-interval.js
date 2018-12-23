class SendingInterval {
	constructor(minTime = 0, maxTime = 0){
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
	faster(){
		this._time = 0;
	}
	slow(){
		this._time = this._maxTime;
	}
	slower(){
		this._time = this._maxTime * 5;
	}
}

module.exports = SendingInterval;