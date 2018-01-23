const {CLIENT_ID=1, CLIENT_SECRET=1, PORT=8090} = process.env,
      SlackStrategy = require('passport-slack').Strategy,
      passport = require('passport'),
      express = require('express'),
      app = express();

// setup the strategy using defaults
passport.use(new SlackStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET
  }, (accessToken, refreshToken, profile, done) => {
    // optionally persist profile data
    done(null, profile);
  }
));

app.use(passport.initialize());
app.use(require('body-parser').urlencoded({ extended: true }));

// path to start the OAuth flow
app.get('/auth/slack', passport.authorize('slack'));

// OAuth callback url
app.get('/auth/slack/callback',
  passport.authorize('slack', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

app.post('/', (req, res) =>{
	if ( req.body && req.body.challenge ) {
		res.send(req.body.challenge);
	}
} );

app.listen(PORT);