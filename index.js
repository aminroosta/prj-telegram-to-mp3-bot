var TelegramBot = require('node-telegram-bot-api');
var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('./database');

function get_toekn() {
	var token = JSON.parse(require('fs').readFileSync('token.json', 'utf8'));
	if(process.env.OPENSHIFT_NODEJS_PORT)
		return token.to_mp3_bot; // open shift bot
	return token.debug_bot; // debug bot
}

function create_bot(token) {
	var bot = null;
	if(process.env.OPENSHIFT_NODEJS_PORT) {
		// See https://developers.openshift.com/en/node-js-environment-variables.html
		var port = process.env.OPENSHIFT_NODEJS_PORT;
		var host = process.env.OPENSHIFT_NODEJS_IP;
		var domain = process.env.OPENSHIFT_APP_DNS;

		bot = new  TelegramBot(token, {webHook: {port: port, host: host}});
		// OpenShift enroutes :443 request to OPENSHIFT_NODEJS_PORT
		bot.setWebHook(domain+':443/bot'+token);
	}
	else { /* we are on local host */
		bot = new TelegramBot(token, {polling: true});
	}
	return bot;
}


function run_bot() {
	var bot = create_bot(get_toekn());

	bot.on('message', function (msg) {
		var chatId = msg.chat.id;
		var text = msg.text;
		if(text === '/start') {
			bot.sendMessage(chatId, "Welcome, Send me a file and i will convert it to mp3.");
			return;
		}
			bot.sendMessage(chatId, "Hello world.");
	});
}

run_bot();
