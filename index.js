const PORT = 8090,
      express = require('express'),
      app = express(),
	  createCanduit = require('canduit'),
	  { SlackClient } = require('@slack/client'),
	  slackToken = "xoxp-2155697888-23783382054-302812961136-181d8feb9ef47f690ebe731a0a9abccf", //testing token
	  slackClient = new SlackClient(slackToken);

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
			token: 'api-po3fqfgnn6jtqdltfb3zhd7owcb3'
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
	if ( req.body.event.type === 'message' && req.body.event.channel == "C8WM9Q5FS" ) {
		console.log( req.body.event.text )

		var phabIds = lookupPhabIds( req.body.event.text );

		if (phabIds ) {

			getPhabInfo( phabIds ).then( ticketsData => {
				//post slack messages
				// message mock
				var testMessage = {
					"text": "I am a test message with with TT183151",
					"attachments": [
						{
							"title": "Change copy on empty preview",
							"title_link": "https://phabricator.wikimedia.org/T183151",
							"text": "Background After discussing the best way to handle previews when we have an error...",
							"image_url": "https://phab.wmfusercontent.org/file/data/s37v4uvxvzwnsdpsmdux/PHID-FILE-vkbuqfcvjokm45fb6a6q/Screen_Shot_2017-12-19_at_6.23.33_PM.png",
							"footer": "Have a phabtastic day!",
							"footer_icon": "https://phab.wmfusercontent.org/res/phabricator/adb05a97/rsrc/favicons/apple-touch-icon-76x76.png",
							"fields": [
								{
									"title":"Author",
									"value": "ovasileva",
									"short": true
								},
												{
									"title":"Assigned to",
									"value": "ABorbaWMF",
									"short": true
								},
								{
									"title": "Date",
									"value": "Dec 18 2017",
									"short": true
								},
								{
									"title": "Points",
									"value": 3,
									"short": true
								}
							]
						}
					]
				}; // end attachment mock

				// See: https://api.slack.com/methods/chat.postMessage
				slackClient.chat.postMessage(req.body.event.channel, testMessage)
				.then((res) => {
					// `res` contains information about the posted message
  					console.log('Message sent: ', res);
				})
				.catch(console.error);
		  });
		}
	}
} );

app.listen(PORT);
console.log(`App listening on port ${PORT}`);
