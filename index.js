const PORT = 8090,
      express = require('express'),
      app = express(),
      createCanduit = require('canduit');



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
	if ( req.body.event.type === 'message' ) {
		console.log( req.body.event.text )

		var phabIds = lookupPhabIds( req.body.event.text );
		if (phabIds) {
			getPhabInfo( phabIds ).then( ticketsData => {
		    	//post slack messages
		  });
		}
	}
} );

app.listen(PORT);
console.log(`App listening on port ${PORT}`);
