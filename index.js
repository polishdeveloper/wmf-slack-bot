const { PORT = 8090, SLACK_TOKEN = '', PHABRICATOR_TOKEN = ''} = process.env
	express = require('express'),
	app = express(),
	createCanduit = require('canduit'),
	{ WebClient:SlackClient } = require('@slack/client'),
	slackClient = new SlackClient(SLACK_TOKEN);

app.use(express.json()); // to support JSON-encoded bodies
app.use(require('body-parser').urlencoded({ extended: true }));

function lookupPhabIds( text ) {
	return text ? text.match( /t[0-9]+(\#\w+)?/gi ) : [];
}

function lookupGerritIds( text ) {
	return [];
}

function createSlackAttachement(title, uri, fields) {
	var attachment = {
		fallback: title,
		title: title,
		title_link: uri,
//		text": "Background After discussing the best way to handle previews when we have an error...",
//		image_url": "https://phab.wmfusercontent.org/file/data/s37v4uvxvzwnsdpsmdux/PHID-FILE-vkbuqfcvjokm45fb6a6q/Screen_Shot_2017-12-19_at_6.23.33_PM.png",
		footer: "Have a phabtastic day!",
		footer_icon: "https://phab.wmfusercontent.org/res/phabricator/adb05a97/rsrc/favicons/apple-touch-icon-76x76.png",
		fields: []
	};
	for( var key in fields ) {
		if (fields.hasOwnProperty(key)) {
			attachment.fields.push({
				"title": key,
				"value": fields[key],
				"short": true
			});
		};
	}
	return attachment;
}

function getPhabInfo( idsWithComments ) {
	var ids = [];
	ids = idsWithComments.map( (ticket) => {
		var parts = ticket.split('#');
		return parts[0]
	});

	return new Promise( (resolve, reject ) => {
		createCanduit({
			api: 'https://phabricator.wikimedia.org/api/',
			token: PHABRICATOR_TOKEN
		}, (err, canduit) => {
			if (err) {
				reject(err);
			} else {
				canduit.exec('phid.lookup', { names: ids }, ( queryErr, tasks ) => {
					if (queryErr) {
						reject(queryErr);
					}
					resolve(tasks);
				} );
			}
		});
	} );
}

app.post('/', (req, res) => {
	// initial url verification
	if ( req.body && req.body.challenge ) {
		console.log('Got a challenge request');
		res.send(req.body.challenge);
		return;
	}
	var type = req.body.event.type;

	if ( ( type === 'message' || type === 'link_shared' ) && !req.body.event.bot_id ) {
		console.log(req.body.event);
		var phabIds = lookupPhabIds( req.body.event.text );
		console.log('Found phab ids: ', phabIds);
		if ( phabIds.length > 0 ) {
			getPhabInfo( phabIds ).then( ticketsData => {
				var task = ticketsData[phabIds[0]]; //assume only first
				slackClient.chat.postMessage(req.body.event.channel, 'Task details', {
					unfurl_links: false,
					attachments: [
						createSlackAttachement( task.fullName, task.uri, { Status: task.status})
					]
				}).then(() => {
					console.log('Message sent');
				}).catch(console.error);
		  });
		}
	}

	res.sendStatus(200);
} );

app.listen(PORT);
console.log(`App listening on port ${PORT}`);
