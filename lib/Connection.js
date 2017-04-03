#!/usr/bin/env node

var Net = require('net');
 
var spacer = String.fromCharCode( 160 );

module.exports = function(args) {

	var self = this;
	args = args || {};

	self.services = args.services;

	self.state = 'WAITING';

	self.host = args.host;
	self.port = args.port;

	self.socket = undefined;
	self.connect    = function( host, port ) {

		self.state = 'READY';

		host = host || self.host;
		port = port || self.port;

		self.host = host;
		self.port = port;

		self.connection = new Net.Socket();
		self.connection.on('error', function(data){
			var text = data.toString('utf8');
			self.services.SEND_MSG_FN( text, 'alert', self.disconnect );
		});

		self.connection.on('close', function() {
			self.services.SEND_MSG_FN( 'connection closed', 'alert', self.disconnect );
		});

		self.connection.on('data', function( buffer ) {
			var text = buffer.toString( 'utf8' );
			    text = text.replace( /\r/gm, '' );
			    text = text.replace( /^\n+/m, '' );

			var rg   = new RegExp( String.fromCharCode( 65533 ), 'gm' ); /* what is this? */
			    text = text.replace( rg, '' );

			var blocks = self.formatOutput( text );
			self.services.SEND_MSG_FN( blocks );
		})

		self.connection.connect( port, host, function() {
			self.services.SEND_MSG_FN( 'CONNECTED', 'alert' );
		});

	}

	self.disconnect = function() {
		self.state = 'WAITING';
		if ( self.connection ) {
			self.connection.end();
		}
	}

	self.send = function(text) {
		self.connection.write( text + "\n" );
	}


	self.formatOutput = function( text ) {

		var lines = text.split(/\n/),
		    blocks = [],
		    buff   = '',
		    prompt = new RegExp(/^[^<>]+>\s*$/)
		lines.forEach(function(l) {
			if ( l.match(prompt) ) {
				if ( buff > '' ) { blocks.push( { text: buff, level: 'message' } ); }
				buff = '';
				blocks.push( { text: l, level: 'highlight' } );
			} else {
				buff = buff + "\n" + l;
			}
		})
		if ( buff > '' ) { blocks.push( { text: buff, level: 'message' } ); }

		return blocks;

	}

	return self;

}
