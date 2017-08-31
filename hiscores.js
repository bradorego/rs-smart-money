var rsapi = require('runescape-api');

var users = [];

if (process.argv.length > 2) {
  let i = 2;
  users = [];
  for (i = 2; i < process.argv.length; i++) {
    users.push(process.argv[i]);
  }
}

users.forEach((user) => {
  rsapi.rs.hiscores.player(user).then(function (info) {
    console.log(user);
    console.log(info.skills);
  }).catch((err) => {
    console.error(err);
  });
});


