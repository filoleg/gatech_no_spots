/**
 * Module dependencies.
 */
var accountSid = 'placeholder'; 
var authToken = 'placeholder';
var twilio_number = "placeholder"
var phone = require('phone');//used to check phone format
 
//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken); 
var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var csrf = require('lusca').csrf();
var methodOverride = require('method-override');
var PythonShell = require('python-shell');
var _ = require('lodash');
//var MongoStore = require('connect-mongo')(session);
var flash = require('express-flash');
var path = require('path');
//var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
var connectAssets = require('connect-assets');

/**
 * DB Stuff
 */
//var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/no_spots_at_tech_db');

/**
 * Controllers (route handlers).
 */

var homeController = require('./controllers/home');
var userController = require('./controllers/user');
var apiController = require('./controllers/api');
var contactController = require('./controllers/contact');

/**
 * API keys and Passport configuration.
 */

var secrets = require('./config/secrets');
var passportConf = require('./config/passport');

/**
 * Create Express server.
 */

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

/**
 * Connect to MongoDB.
 */

//mongoose.connect(secrets.db);
//mongoose.connection.on('error', function() {
//  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
//});

/**
 * CSRF whitelist.
 */

var csrfExclude = ['/url1', '/url2'];

/**
 * Express configuration.
 */

app.set('port', process.env.PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compress());
app.use(function(req,res,next){
    req.db = db;
    next();
});
app.use(connectAssets({
  paths: [path.join(__dirname, 'public/css'), path.join(__dirname, 'public/js')]
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secrets.sessionSecret,
  //store: new MongoStore({ url: secrets.db, autoReconnect: true })
}));
//app.use(passport.initialize());
//app.use(passport.session());
app.use(flash());
app.use(function(req, res, next) {
  // CSRF protection.
  if (_.contains(csrfExclude, req.path)) return next();
  csrf(req, res, next);
});
app.use(function(req, res, next) {
  // Make user object available in templates.
  res.locals.user = req.user;
  next();
});
app.use(function(req, res, next) {
  // Remember original destination before login.
  var path = req.path.split('/')[1];
  if (/auth|login|logout|signup|fonts|favicon/i.test(path)) {
    return next();
  }
  req.session.returnTo = req.path;
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Main routes.
 */

//app.get('/', homeController.sectionlist);
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);

/**
 * API examples routes.
 */

app.get('/api', apiController.getApi);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/aviary', apiController.getAviary);
app.get('/api/steam', apiController.getSteam);
app.get('/api/stripe', apiController.getStripe);
app.post('/api/stripe', apiController.postStripe);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twilio', apiController.getTwilio);
app.post('/api/twilio', apiController.postTwilio);
app.get('/api/clockwork', apiController.getClockwork);
app.post('/api/clockwork', apiController.postClockwork);
app.get('/api/foursquare', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFoursquare);
app.get('/api/tumblr', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getTumblr);
app.get('/api/facebook', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFacebook);
app.get('/api/github', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getGithub);
app.get('/api/twitter', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getTwitter);
app.post('/api/twitter', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.postTwitter);
app.get('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getVenmo);
app.post('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.postVenmo);
app.get('/api/linkedin', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getLinkedin);
app.get('/api/instagram', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getInstagram);
app.get('/api/yahoo', apiController.getYahoo);

/**
 * OAuth sign-in routes.
 */

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});

/**
 * OAuth authorization routes for API examples.
 */

app.get('/auth/foursquare', passport.authorize('foursquare'));
app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), function(req, res) {
  res.redirect('/api/foursquare');
});
app.get('/auth/tumblr', passport.authorize('tumblr'));
app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), function(req, res) {
  res.redirect('/api/tumblr');
});
app.get('/auth/venmo', passport.authorize('venmo', { scope: 'make_payments access_profile access_balance access_email access_phone' }));
app.get('/auth/venmo/callback', passport.authorize('venmo', { failureRedirect: '/api' }), function(req, res) {
  res.redirect('/api/venmo');
});

/**
 * 500 Error Handler.
 */

app.use(errorHandler());

/**
 * Function for updating the DB
 */ 


/**
 * Start Express server.
 */

server.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});


io.on('connection', function(socket) {
  
  /*client.messages.create({  
    to: "+17709068910", 
    from: "+16789713520", 
    body: "111",    
  }, function(err, message) { 
    console.log(message.sid); 
  });*/
    

  
  socket.emit('greet', { message: 'Connection is successful!' });
  socket.on('respond', function(data, current_course) {
    console.log(data);
    var collection = db.get('sections');
    collection.find({course : current_course },{},function(e,data) {
    socket.emit("update_sections",data)
    })
  });
  
  socket.on('update_sections', function(cur_course){
    current_course = cur_course
    //console.log(sections);
    //console.log("yay, updating stuff from server");
    var collection = db.get('sections');
    collection.find({course : current_course },{},function(e,data) {
       socket.emit("update_sections",data)
    }) 
  });
  
  socket.on('find_sections', function(course_name){
    //console.log(sections);
    //console.log("yay, updating stuff from server");
    var collection = db.get('sections');
    collection.find({course : course_name },{},function(e,data) {
       if (data != "") socket.emit("update_sections",data)
    }) 
  });
  
  socket.on('add_CRN', function(phone_num, CRN_rawlist) {
    var crns = db.get('CRNs')
    var CRN_list = CRN_rawlist.split(',').map(function (val) { return (+val).toString(); });
    var collection = db.get('sections');
    var CRN_list_clear =[]
    //console.log(CRN_list[0]);
    var phone_number = phone(phone_num);
    if (phone_number[0] == null) {
      socket.emit('wrong_phone');
    } else if (CRN_list[0] == null) {
      socket.emit('wrong_CRN');
    } else {
      CRN_list.forEach(function(item) {
        collection.find({"CRN" : item},{}, function(e,crn_in_sections) {
          if (crn_in_sections != ""){
            crns.find({"CRN" : item},{}, function(e,crn) {
              if (crn != "") {
                var phone_num = phone_number[0];
                //console.log(crn[0].phone_nums)
                //console.log(CRN_list[index]);
                crns.update( 
                  { "CRN" : item }, 
                  { $set: { "phone_nums" : phone_union(phone_num, crn[0].phone_nums)}});
              } else {
                var phone_num = phone_number[0];
                //console.log(CRN_list[index]);
                crns.insert({ "CRN" : item, "phone_nums" : phone_num}) ;      
              } 
              console.log("pushed " + item + " to the clear list, ya")
              CRN_list_clear.push(item);
              socket.emit('added_CRN');
            });
          }
        });
      }); 
    }

      //console.log(CRN_list_clear);
      //if(CRN_list_clear.length > 0) socket.emit('added_CRN');
      //else socket.emit('wrong_CRN');
  })   
});

function phone_union (new_num, old_nums) {
  //console.log("new: " + new_num + ' old: ' + old_nums)
  if ((typeof old_nums) == "object") {
    
    var isDouble = old_nums.forEach(function(elem) {
      if (elem == new_num) return true
    })
    if (isDouble = true) return old_nums
    else {
      old_nums.push(new_num);
      return old_nums
    }
  } else {
    //console.log([new_num, old_nums]);
    if (new_num != old_nums) return [new_num, old_nums];
    else return old_nums
  }
}


var options = {
  pythonPath: '/usr/local/Cellar/python3/3.4.2_1/Frameworks/Python.framework/Versions/3.4/Resources/Python.app/Contents/MacOS/Python',
  scriptPath: '../gatech_no_spots/'
};


var text_notifications_update_count = 0;

function notify_user(phone_num, CRN, course) {
  client.messages.create({
    to: phone_num,
    from: twilio_number,
    body: 'Good news! ' + course + ' (CRN: ' + CRN + ") just got a free spot. Go register through buzzport or oscar before someone else claimed it!"
  }, function(err, message) {
    console.log(message.sid);
  })
    console.log("text about CRN " + CRN + " sent to " + phone_num);
};


setInterval(function() {
  var crn_collection = db.get('CRNs');
  var collection = db.get('sections');
  crn_collection.find({},{scope:{collection:collection, crn_collection:crn_collection}},function(e,crns_to_notify) {
    crns_to_notify.forEach(function(crn) {
      var phones_to_notify = crn.phone_nums;
      //console.log(crn.phone_nums);
      collection.find({ CRN : crn.CRN },{scope:{phones_to_notify:phones_to_notify}, crn_collection:crn_collection},function(e,data) {
        if (parseInt(stripAlphaChars(data[0].seats_left), 10) > 0) {
          console.log("yay, free seats in " + data[0].course + " (CRN: " + data[0].CRN + ")");
          console.log("notifying " + phones_to_notify);
          notify_user(phones_to_notify, data[0].CRN, data[0].course);
          var CRN_notified = data[0].CRN;
          console.log("CRN notified " + CRN_notified)
          crn_collection.remove({ CRN: CRN_notified})
        }
      });
    });  
  });
}, 20*1000);

function stripAlphaChars(source) { 
  var out = source.replace(/[^0-9]/g, ''); 

  return out; 
}


function db_update(db_update_count){
  PythonShell.run('oscar_retrieval.py', options, function (err, results) {
    if (err) throw err;
    // results is an array consisting of messages collected during execution
    console.log('results: %j', db_update_count);
    //db_update_count++;
    db_update(db_update_count+1);
    //comment this line out if you want to build the db along with commenting out appropriate lines in tge .py file
  }); 
}

db_update(0);
module.exports = app;
