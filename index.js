var TelegramBot = require('node-telegram-bot-api');
var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('./database');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');

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
    console.warn(JSON.stringify(msg));
    if(text === '/start') {
      bot.sendMessage(chatId, "Welcome, Send me a file and i will convert it to mp3.");
      return;
    }
    if(!msg.video && !msg.document) {
      bot.sendMessage(chatId, "Send me a file and i will convert it to mp3.");
      return;
    }
    var video = msg.video || msg.document;
    bot.sendMessage(chatId, 'Downloading from telegram: ' + video.file_name + ' ...');
    bot.downloadFile(video.file_id, 'downloads')
      .then(function(filePath) {
        bot.sendMessage(chatId, 'Converting '+ video.file_name + ' ...');
        var mp3FileName = video.file_name.substr(0, video.file_name.lastIndexOf(".")) + '_' + chatId + '_.mp3';
        var mp3FilePath = 'downloads/' + mp3FileName;
        new ffmpeg(filePath)
            .audioBitrate(320)
            .saveToFile(mp3FilePath)
            .on('error', function(err) {
              console.warn(err);
              bot.sendMessage(chatId, 'Conversion failed for '+ video.file_name);
              fs.unlink(filePath);
            })
            .on('end', function() {
              bot.sendMessage(chatId, 'Uploading to telgram: '+ mp3FileName + ' ...');
              bot.sendAudio(chatId, mp3FilePath)
                .then(function() {
                  fs.unlink(mp3FilePath);
                })
              fs.unlink(filePath);
            });
      })
      .catch(function(e) {
        console.warn(e);
        bot.sendMessage(chatId, 'Failed to download'+ video.file_name);
      });
  });
}

run_bot();
