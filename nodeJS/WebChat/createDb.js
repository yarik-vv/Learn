var User = require('models/user').User;

var user = new User({
  username: "Tester11",
  password: "secret"
});

user.save(function(err, user, affected) {
  if (err) throw err;

  User.findOne({username: "Tester10"}, function(err, tester) {
    console.log(tester);
  });
});