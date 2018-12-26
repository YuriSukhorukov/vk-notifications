const states = require('./states');

const sender = {
	state: {},
	states,
	message: '',

	async action () {
		this.state.action(this);
	},

	setState (state) {
		this.state = state;
	},

	setMessage (msg) {
		this.message = msg;
	}
}

module.exports = sender;