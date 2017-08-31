/// scrape.js

var request = require('request');
var cheerio = require('cheerio');
var firebase = require("firebase");
firebase.initializeApp({
  apiKey: "AIzaSyBjwJEBgAq8iHdkYhXXIOCLuV172agVQ7Y",
  authDomain: "rs-moneymaking.firebaseapp.com",
  databaseURL: "https://rs-moneymaking.firebaseio.com",
  projectId: "rs-moneymaking",
  storageBucket: "rs-moneymaking.appspot.com",
  messagingSenderId: "247482085782"
});
var dbRef = firebase.database().ref();

var handleResponse = function(error, response, html) {
  // First we'll check to make sure no errors occurred when making the request
   if (!error) {
    // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
    var $ = cheerio.load(html);
    var cells = [],
      currentItem = {},
      currentSkill = {},
      level = 0,
      itemList = [],
      $skill = {};
    $("table.wikitable").eq(0).find("tr").each(function (i) { /// pull only the first table for now
      if (i === 0) { /// do nothing on the first element because it's the headers
        return;
      }
      currentItem = {
        "members": false,
        "category": "",
        "skills": [],
        "profit": 0
      };
      cells = $(this).find("td").toArray();
      /// 0 === title, 1 === profit, 2 === skills, 3 === category, 4 === member
      currentItem.name = $(cells[0]).text().replace(/\n/g, ''); /// remove \n at end of name
      currentItem.profit = parseInt($(cells[1]).text().replace(/,/g, ''), 10); /// remove the commas and parse
      currentItem.category = $(cells[3]).text().split("/")[0].replace(/\n/g, ''); /// get rid of Combat/[Diffculty]
      
      $(cells[2]).html().split("<br>").forEach((skill) => { /// split each row
        level = 0
        level = parseInt(skill.split(" ")[0], 10); /// get the number
        if (isNaN(level)) { /// if no skill level, don't add it
          return;
        }
        $(skill).find("img").each(function (index) { /// go through every image
          if (index % 2 === 0) { /// there's a base64 version and an external for some godawful reason
            currentItem.skills.push({ /// add every skill on the row to this item's list
              "level": level,
              "type": $(this).attr("alt").split("-")[0] /// alt is [skill type]-icon
            });
          }
        });
      });
      if ($(cells[4]).text() === "Yes") {
        currentItem.members = true; /// boolean are better than text
      }
      itemList.push(currentItem);
    });

    itemList.sort((a,b) => { /// sort it high to low for funsies
      return (a.profit > b.profit) ?  -1 : 1;
    });
    firebase.database().ref("items").set(itemList);
    firebase.database().goOffline(); /// tell FB to release so node process ends
  }
};

request("http://runescape.wikia.com/wiki/Money_making_guide", handleResponse);
