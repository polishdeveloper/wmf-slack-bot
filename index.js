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
function getPhabInfo( ids ) {
	return new Promise( (resolve, reject ) => {
           createCanduit({
	       'api': 'https://phabricator.wikimedia.org/api/'
	   }, (err, canduit) => {
              if (err) {
		      console.log(err);
		      reject(err);
	      } else {
	      	canduit.exec('phid.query', { phids: ids }, ( queryErr, tasks ) => {
		  if (queryErr) {
			  console.log(queryErr);
			  reject(queryErr);
		  }
			console.log(tasks);
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
		  console.log('Found ', phabIds, '  in message, asking phabricator.');
		}
	}
} );

app.listen(PORT);
console.log(`App listening on port ${PORT}`)

