#!/usr/bin/env node

var Config      = require('yaml-configuration-loader'),
    credentials = Config.load( process.env.CREDENTIALS || ( __dirname + '/../config/slack_credentials.yaml' ) );

var debug  = process.env.DEBUG || false;
var Botkit  = require('botkit'),
    slack   = Botkit.slackbot({ debug: debug }),
    spawn   = slack.spawn({
                        token: credentials.BOTKIT_TOKEN,
                        "incoming_webhook": {
                                'url': credentials.BOTKIT_URL
                        }
                });

var Services = require('./Slack/Services.js'),
    Connection = require('./Connection.js');

/* this belongs in a config { arctic: { host: '', port: 123 } } */
var host = 'mud.arctic.org',
    port = 2700;

var myName    = 'mudco';
var setName = function( bot ) {
        try { myName = bot.identity.name }
        catch (e) { console.log( 'bot has no identity?', e ) }
}

var theseConnections = {};
var createConnection = function( bot, msg ) {
	var services = new Services( { bot: bot, message: msg } );
	theseConnections[msg.channel] = new Connection( { services: services });
}

var getHelpText = function( bot ) {
	setName(bot);
	var thisMsg = '@' + myName + " connect\n"
			+ 'connects to ' + host + ' ' + port + "\n"
			+ "Note: Slack has a limitation of sending an empty line, so send a single period, ie '.'\n"
	return thisMsg;
}

slack.hears('^help', 'direct_mention', function( bot, msg ) { 
	var thisMsg = getHelpText(bot);
	bot.say( { channel: msg.channel, text: '```' + thisMsg + '```' });
})

slack.hears("^connect", 'direct_mention', function( bot, msg ) {

	var thisChannel = msg.channel;
	if ( ! theseConnections[thisChannel] ) { createConnection(bot,msg) };

	var thisConnection = theseConnections[thisChannel];
	if ( thisConnection.state == 'READY' ) { 
		theseConnections[thisChannel].services.SEND_MSG_FN( 'already connected', 'alert' )
		return;
	}

	theseConnections[thisChannel].connect( host, port );
	thisConnection.services.SET_TOPIC_FN( host + ' ' + port, 'bold' );

});

slack.hears("^\\s*(\\w|\\.|')", 'ambient', function( bot, msg ) {

	var thisChannel    = msg.channel,
	    thisConnection = theseConnections[thisChannel];

	if ( ! thisConnection || thisConnection.state != 'READY' ) { return };

	if ( msg.text == '.' ) { msg.text = ''; }
	thisConnection.send( msg.text );


});

slack.hears('^(disconnect|end)', 'direct_mention', function( bot, msg ) {
	var thisChannel    = msg.channel,
	    thisConnection = theseConnections[thisChannel];
	if ( ! thisConnection ) { return };
	thisConnection.disconnect();
});

spawn.startRTM();

