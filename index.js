const { PORT = 8090, SLACK_TOKEN = '', PHABRICATOR_TOKEN = ''} = process.env
	express = require('express'),
	app = express(),
	createCanduit = require('canduit'),
	{ WebClient:SlackClient } = require('@slack/client'),
	slackClient = new SlackClient(SLACK_TOKEN);

app.use(express.json()); // to support JSON-encoded bodies
app.use(require('body-parser').urlencoded({ extended: true }));

function lookupPhabIds( text ) {
	if (text === undefined)
		return [];
	var idMatches = text.match( /t[0-9]+(\#\w+)?/gi );
	return idMatches;
}

function lookupGerritIds( text ) {
	return [];
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
	if ( req.body.event.type === 'message'
		&& !req.body.event.bot_id
	) {
		var phabIds = lookupPhabIds( req.body.event.text );
		if (phabIds ) {
			getPhabInfo( phabIds ).then( ticketsData => {
				var task = ticketsData[phabIds[0]]; //assume only first

				var options = {
					unfurl_links: false,
					attachments: [
						{
							"fallback": task.fullName,
							"title": task.fullName,
							"title_link": task.uri,
//							"text": "Background After discussing the best way to handle previews when we have an error...",
//							"image_url": "https://phab.wmfusercontent.org/file/data/s37v4uvxvzwnsdpsmdux/PHID-FILE-vkbuqfcvjokm45fb6a6q/Screen_Shot_2017-12-19_at_6.23.33_PM.png",
							"footer": "Have a phabtastic day!",
//							"footer_icon": "https://phab.wmfusercontent.org/res/phabricator/adb05a97/rsrc/favicons/apple-touch-icon-76x76.png",
							"fields": [
								{
									"title":"Status",
									"value": task.status,
									"short": true
								}
							]
						}
					]
				}; // end attachment mock

				// See: https://api.slack.com/methods/chat.postMessage
				slackClient.chat.postMessage(req.body.event.channel, 'Task details', options)
				.then(() => {
  					console.log('Message sent');
				})
				.catch(console.error);
		  });
		}
	}
	res.sendStatus(200);
} );

app.listen(PORT);
console.log(`App listening on port ${PORT}`);
