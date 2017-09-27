var express = require("express");
var app = express();
var compression = require("compression");
var bodyParser = require("body-parser");
var logger = require("morgan");
var firebase = require("firebase");
firebase.initializeApp({
  apiKey: "AIzaSyBjwJEBgAq8iHdkYhXXIOCLuV172agVQ7Y",
  authDomain: "rs-moneymaking.firebaseapp.com",
  databaseURL: "https://rs-moneymaking.firebaseio.com",
  projectId: "rs-moneymaking",
  storageBucket: "rs-moneymaking.appspot.com",
  messagingSenderId: "247482085782"
});
var itemRef = firebase.database().ref("items");
var rsapi = require('runescape-api');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('www'));
app.use(compression());

let calculateCombatLevel = function (skills) { /// formula from http://runescape.wikia.com/wiki/Combat_level
  return Math.floor((1.3 * Math.max((skills.attack.level + skills.strength.level), 2 * skills.magic.level, 2*skills.ranged.level) + skills.defence.level + skills.hitpoints.level + Math.floor(skills.prayer.level / 2) + Math.floor(skills.summoning.level / 2)) / 4)
};

let getFilteredItems = function (username, res, next) {
  Promise.all([itemRef.once("value"), rsapi.rs.hiscores.player(username)])
    .then(([itemSnapshot, user]) => {
      let items = itemSnapshot.val();
      console.log(items.length);

      user.skills.combat = {"level": (calculateCombatLevel(user.skills))};
      let able = items.filter((item) => {
        if (!item.skills) {
          return true;
        }
        let goodToGo = true;
        item.skills.forEach((skill) => {
          if (skill.type === "constitution") {
            skill.type = "hitpoints"; /// i hate you rsapi
          }
          // console.log(skill.level, user.skills[skill.type].level);
          if (skill.level > user.skills[skill.type].level) {
            goodToGo = false;
            return false;
          }
        });
        return goodToGo;
      });

      let unable = items.filter((item) => { /// I'm sure there's a better way to do this...
        if (!item.skills) {
          return false;
        }
        let goodToGo = false;
        item.skills.forEach((skill) => {
          if (skill.type === "constitution") {
            skill.type = "hitpoints"; /// i hate you rsapi
          }
          // console.log(skill.level, user.skills[skill.type].level);
          if (skill.level > user.skills[skill.type].level) {
            goodToGo = true;
            return true;
          }
        });
        return goodToGo;
      });

      console.log(able.length);
      res.json({"able": able, "unable": unable});
      firebase.database().goOffline(); /// tell FB to release so node process ends
    }).catch((err) => {
      console.error(err);
      res.status(err.statusCode).send(err);
    });
  };

app.get("/user/:user", function (req, res, next) {
  getFilteredItems(req.params.user, res);
});

process.env.TZ = "America/Chicago";
app.set('port', process.env.PORT || 5000);
app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
