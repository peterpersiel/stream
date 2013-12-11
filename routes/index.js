var gravatar = require('gravatar')
,   github3 = require('github3')
,   cache   = require('memory-cache')
,   Twit    = require('twit')
,   async = require('async');

exports.contact = function(req, callback) {
    if (process.env.NODE_ENV == 'production') {
        var sendgrid  = require('sendgrid')(
            req.nconf.get('sendgrid:api_user'),
            req.nconf.get('sendgrid:api_key')
        );
    } else {
        var sendgrid = {
            send: function(payload, cb) {
                console.log('Sending mail');
                console.log(payload);

                cb(null, null)
            }
        };
    }

    req.checkBody('name', 'Please enter your name.').len(1, 100);
    req.checkBody('email', 'Please enter a valid email address.').isEmail();
    req.checkBody('message', 'Please enter your name.').len(1, 1000);
    req.checkBody('subject', 'Please enter a subject.').len(1, 100);

    var errors = req.validationErrors();
    var result = {
        errors: errors || [],
        values: {
            name: '',
            email: '',
            message: '',
            subject: ''
        }
    };


    if (errors) {
        result.values = {
            name: req.param('name'),
            email: req.param('email'),
            message: req.param('message'),
            subject : req.param('subject'),
        };

        callback(result);

    } else {
        var payload = {
          to      : req.nconf.get('sendgrid:receiver'),
          from    : req.param('email'),
          fromname: req.param('name'),
          subject : req.param('subject'),
          text    : req.param('message')
        };

        sendgrid.send(payload, function(err, json) {
            if (!err) {
                callback(result);
            }
        });
    }

    
};

exports.getGravatar = function(nconf) {
    return gravatar.url(
        nconf.get('gravatar:email'),
        {s: 150, r: 'x', d: 'retro'},
        true
    );
};

exports.getRepos = function(callback, nconf) {
    if (cache.get('repos') === null) {
        console.log('getRepos');

         // get users repos
        github3.getUserRepos(nconf.get('github:username'), function(error, repos) {
            cache.put('repos', repos, 360000);
            callback(repos);
        });
    } else {
        callback(cache.get('repos'));
    }
};

exports.getTweets = function (callback, nconf) {
    if (cache.get('tweets') === null) {

        console.log('getTweets');

        var T = new Twit(nconf.get('twitter'));

        T.get(
            'statuses/user_timeline',
            {
                screen_name: nconf.get('twitter:username'),
                count: 10,
                include_rts: false
            },
            function (err, reply) {
                cache.put('tweets', reply, 360000);
                callback(reply);

            }
        );
    } else {
        callback(cache.get('tweets'));
    }
};

exports.index = function(req, res){

    res.locals.gravatar         = exports.getGravatar(req.nconf);
    res.locals.twitter_username = req.nconf.get('twitter:username');
    res.locals.github_username  = req.nconf.get('github:username');

    var series = [
        function(callback) {
            exports.getTweets(function(tweets) {
                callback(null, tweets);
            }, req.nconf);
        },
        function(callback) {
            exports.getRepos(function(repos) {
                callback(null, repos);
            }, req.nconf);
        }
    ];

    if (req.method == 'POST') {
        series.push(function(callback) {
            exports.contact(req, function(result) {
                callback(null, result)
            })
        });
    }

    async.series(series,
        function(error, results) {
            var locals = {
                tweets: results[0],
                repos: results[1]
            };

            if (results.length > 2) {
                locals.contact = results[2];
            }

            res.render('index', locals);
        }
    );
};
