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

let calculateCombatLevel = function (skills) { /// formula from http://runescape.wikia.com/wiki/Combat_level
  return Math.floor((1.3 * Math.max((skills.attack.level + skills.strength.level), 2 * skills.magic.level, 2*skills.ranged.level) + skills.defence.level + skills.hitpoints.level + Math.floor(skills.prayer.level / 2) + Math.floor(skills.summoning.level / 2)) / 4)
};

Promise.all([itemRef.once("value"), rsapi.rs.hiscores.player("bradorego")])
  .then(([itemSnapshot, user]) => {
    let items = itemSnapshot.val();
    console.log(items.length);

    user.skills.combat = {"level": (calculateCombatLevel(user.skills))};
    let filtered = items.filter((item) => {
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

    console.log(filtered.length);
    firebase.database().goOffline(); /// tell FB to release so node process ends
  });


