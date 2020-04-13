//jshint esversion:6

// dotenv: as soon as possible
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const md5 = require("md5");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
// stronger than hash
// const bcrypt = require("bcrypt");
// const saltRounds = 10;



const app = express();

// console.log(process.env.API_KEY);
// console.log(md5("123456"));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//set up session
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

// passport initialize
// use passport to manage session
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
});

mongoose.set("useCreateIndex",true);

//  full schema set to use mongoose-encryption
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});
// userchema to use passportlocalmongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// usage of encryption
 // const secret = "Thisisourlittlesecret.";
// // secret: secret, encryptedFields: ["password" ] : which is that encrypt wants to hidden
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });


const User = new mongoose.model("User", userSchema);

// serialise: make identification of users
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// comes from passport-local-mongoose
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// serialise by google oauth20
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// use googleStrategy we login
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  //accesstoken: allows us to get user data
  // refreshToken: access for a long time
  // profile: identification
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    // find or create
    // if there is no google_id, create it
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
passport.authenticate("google",{ scope: ['profile'] }));

app.get('/auth/google/secrets',
// if failed go login page
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
});



app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req,res){
  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // }
  // else {
  //   res.redirect("/login");
  // }

  //lookt through all of users in secret fields where not equal to null
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }
    else{
      if(foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else {
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
    }
  })
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});
// update the code



app.post("/register", function(req, res) {



  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   // Store hash in your password DB.
  //   const newUser = new User({
  //     email: req.body.username,
  //     // take password into irreversible hash
  //     password: hash
  //   });
  //
  //  // encrypt my password field when save
  //   newUser.save(function(err) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       res.render("secrets")
  //     }
  //   });
 // });

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      // using local strategy
      passport.authenticate("local")(req,res, function(){
        res.redirect("/secrets");
      })
    }
  })

});

app.post("/login", function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res, function(){
        res.redirect("/secrets");
      });
    }
  });
  // const username = req.body.username;
  // const password = req.body.password;
  //
  // // email: the data in database
  // // mongoose will decrypt when find
  // User.findOne({email: username}, function(err, foundUser){
  //   if(err){
  //     console.log(err);
  //   }
  //   else{
  //     // the user(email,password) exists
  //     if(foundUser){
  //
  //       bcrypt.compare(password, foundUser.password, function(err, result) {
  //            // result == true
  //            // password after hashing === passwprd in database
  //            if(result === true){
  //               res.render("secrets");
  //            }
  //       });
  //
  //
  //     }
  //   }
  // });

});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
