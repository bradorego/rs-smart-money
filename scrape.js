/// scrape.js

var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var json2csv = require('json2csv');
var Promise = require("bluebird");
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


urls = [
  'http://schedule.sxsw.com/2017/03/09/events',
  'http://schedule.sxsw.com/2017/03/10/events',
  'http://schedule.sxsw.com/2017/03/11/events',
  'http://schedule.sxsw.com/2017/03/12/events',
  'http://schedule.sxsw.com/2017/03/13/events',
  'http://schedule.sxsw.com/2017/03/14/events',
  'http://schedule.sxsw.com/2017/03/15/events',
  'http://schedule.sxsw.com/2017/03/16/events',
  'http://schedule.sxsw.com/2017/03/17/events',
  'http://schedule.sxsw.com/2017/03/18/events'
];

var length = 0,
  returnCount = 0,
  eventCount = 0,
  details = [],
  json = {"events": []};

var printCSV = function (argument) {
  console.log("writing CSV");
  json2csv({data: json.events}, function (err, csv) {
    fs.writeFile("events.csv", csv, function (err) {
      if (!err) {
        console.log("success");
      } else {
        console.error("fail");
      }
    })
  });
};

var handlePM = function (timeChunk) {
  var bits = timeChunk.split(":");
  if (timeChunk.slice(-2) === "pm") {
    bits[0] = parseInt(bits[0]) + 12; /// add 12 hours
    if (bits[0] === 24) {
      bits[0] = 0;
    }
    return bits.join(":");
  } else { /// it's AM
    if (bits[0] === 12) {
      bits[0] = 0;
    }
    return bits.join(":");
  }
  return timeChunk;
};

var handleResponse = function(error, response, html) {
  // First we'll check to make sure no errors occurred when making the request
   if (!error) {
    // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
    var $ = cheerio.load(html);
    // Finally, we'll define the variables we're going to capture
    var title, release, rating;


    var tempEvent = {},
      textTiny = [],
      dateChunks = [], //// split day from time
      timeChunks = [],
      venueChunks = [],
      categoryChunks = []; /// start and end time
    $(".single-event").each(function (i) {
      tempEvent = {}; /// clear out previous event
      // console.log($(this).find(".text-tiny").length);
      textTiny = $(this).find(".text-tiny");

      dateChunks = $(textTiny[0]).html().split("<br>");
      venueChunks = $(textTiny[1]).html().split("<br>");
      categoryChunks = $(textTiny[2]).html().split("<br>");

      if (dateChunks[1] && dateChunks[1].length) {
        timeChunks = dateChunks[1].split(" &#x2013; ");

        timeChunks[0] = handlePM(timeChunks[0]);
        tempEvent.startTime = new Date(dateChunks[0] + " " + (timeChunks[0].slice(0, -2) + ":00")).toLocaleString(); /// day + start time
        if (timeChunks[1] && timeChunks[1].length) {
          timeChunks[1] = handlePM(timeChunks[1]);
          tempEvent.endTime = new Date(dateChunks[0] + " " + (timeChunks[1].slice(0, -2) + ":00")).toLocaleString(); /// day + end time
        } else {
          tempEvent.endTime = "TBA";
        }
      } else {
        tempEvent.startTime = "TBA";
        tempEvent.endTime = "TBA";
      }

      // console.log(venueChunks); /// 0 === name, n-1 === address
      if (venueChunks && venueChunks.length) {
        tempEvent.venueName = $(venueChunks[0]).text();
        tempEvent.venueAddress = venueChunks[venueChunks.length - 1];
      } else {
        tempEvent.venueName = "TBA";
        tempEvent.venueAddress = "TBA";
      }

      // console.log(categoryChunks);
      tempEvent.category1 = $(categoryChunks[0]).text();
      tempEvent.category2 = $(categoryChunks[1]).text();
      tempEvent.category3 = $(categoryChunks[2]).text();

      tempEvent.title = $(this).find("h4").text();

      // console.log(tempEvent);

      details.push(request.get("http://schedule.sxsw.com" + $(this).find("h4").find("a").attr("href"), {"timeout": 5000}, function (err, response, detail) {
        if (detail) {
          var $$ = cheerio.load(detail);
          tempEvent.description = $$(".description").find(".body").text();
          json.events.push(tempEvent);
        }
      }));
    });

    var cells = [],
      currentItem = {},
      currentSkill = {},
      level = 0,
      itemList = [],
      $skill = {};
    // $("table.wikitable").el(0)
    $("table.wikitable").eq(0).find("tr").each(function (i) {
      if (i === 0) { /// do nothing on the first element because it's the headers
        return;
      }
      currentItem = {
        "members": false,
        "category": "",
        "skills": [],
        "profit": 0
      };
      // console.log($(this).find("td").toArray());
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

      if (currentItem.skills.length === 0) {
        delete currentItem.skills;
      }

      if ($(cells[4]).text() === "Yes") {
        currentItem.members = true;
      }
      itemList.push(currentItem);
    });

    itemList.sort((a,b) => { /// sort it high to low for funsies
      return (a.profit > b.profit) ?  -1 : 1;
    });

    firebase.database().ref("items").set(itemList);
    console.log(itemList);
    firebase.database().goOffline();
  }
};


// request('http://schedule.sxsw.com/2017/03/10/events', handleResponse);

request("http://runescape.wikia.com/wiki/Money_making_guide", handleResponse);

// if (process.argv.length > 2) {
//   var i = 2;
//   urls = [];
//   for (i = 2; i < process.argv.length; i++) {
//     urls.push(process.argv[i]);
//   }
//   console.log(urls);
// }
// console.log("fetching events");
// urls.forEach(function (url) {
//   request(url, handleResponse);
// });
