var spacer = String.fromCharCode( 160 );
module.exports = function( args ) {

	var self = this;

	self.bot     = args.bot;
	self.message = args.message;

	self.decorators = {
		'message':   ['```','```'],
		'highlight': ['`','`'],
		'alert':     ['<!channel> *','*'],
		'bold':      ['*','*'],
		'italics':   ['_','_'],
		'plain':     ['','']
	 }

	self.FORMAT_MSG_FN  = function( txt, level ) {

		level = level || 'message';
		if ( typeof level == 'string' ) {
			level = level.split('|')
		}

		var ret = txt;
		ret.replace( / /g, spacer, 'g' );

		level.forEach(function(l) {
			if ( ! self.decorators[l] ) {
				l = 'message'
			};
			var pre = self.decorators[l][0],
			    app = self.decorators[l][1];
			ret = pre + ret + app;
		})

		return ret;
	};

	self.MULTI_FORMAT_FN = function( msgs, level ) {
		msgs  = msgs  || [];
		level = level || 'plain';
		var str = '';
		msgs.forEach(function(msg) {
			var txt = msg.text,
			    lvl = msg.level || level,
			    fmt = self.FORMAT_MSG_FN( txt, lvl );
			str = str + ' ' + fmt
		})
		return str;
	}

	self.FORMAT_PREPPER = function( txt, level, fn ) {
		var thisMsg;
		level = level || 'message';
		fn    = fn    || function() { return true };
		if ( typeof txt == 'string' ) {
			if ( typeof level == 'function' ) {
				fn    = level;
				level = 'message';
			}
			thisMsg = self.FORMAT_MSG_FN( txt, level );
		} else if ( txt instanceof Array ) {
			thisMsg = self.MULTI_FORMAT_FN( txt, level );
			level = 'plain'
		}

		return { text: thisMsg, level: level, fn: fn };
	}

	self.SEND_MSG_FN    = function( txt, level, fn ) {
		var obj = self.FORMAT_PREPPER( txt, level, fn );
		self.bot.say( { channel: self.message.channel, text: obj.text }, function(error,response) {
			if ( error ) { console.log( 'SEND_MSG_FN', error ) };
			obj.fn( self.bot, response );
		});
	}

	self.UPDATE_MSG_FN = function( response, txt, level, fn  ) {
		var obj = self.FORMAT_PREPPER( txt, level, fn );
		self.bot.api.chat.update({ ts: response.ts, channel: response.channel, text: obj.text }, function( error, resp ) {
			if ( error ) { console.log( 'UPDATE_MSG_FN', error ) };
			obj.fn( self.bot, resp );
		})
	}

	self.SET_TOPIC_FN    = function( txt, level, fn ) {
		var obj = self.FORMAT_PREPPER( txt, level, fn )
		self.bot.api.channels.setTopic({ channel: self.message.channel, topic: obj.text } , function(error, resp) {
			if ( error ) { console.log( 'SET_TOPIC_FN', error ) };
			obj.fn( self.bot, resp );
		})
	}

	return self;

}
