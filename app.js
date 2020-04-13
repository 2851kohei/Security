//jshint esversion:6

// dotenv: as soon as possible
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const md5 = require("md5");

// stronger than hash
const bcrypt = require("bcrypt");
const saltRounds = 10;



const app = express();

// console.log(process.env.API_KEY);
// console.log(md5("123456"));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
});

//  full schema set to use mongoose-encryption
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// usage of encryption
 // const secret = "Thisisourlittlesecret.";
// // secret: secret, encryptedFields: ["password" ] : which is that encrypt wants to hidden
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });


const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    const newUser = new User({
      email: req.body.username,
      // take password into irreversible hash
      password: hash
    });

   // encrypt my password field when save
    newUser.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        res.render("secrets")
      }
    });
});


});

app.post("/login", function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  // email: the data in database
  // mongoose will decrypt when find
  User.findOne({email: username}, function(err, foundUser){
    if(err){
      console.log(err);
    }
    else{
      // the user(email,password) exists
      if(foundUser){

        bcrypt.compare(password, foundUser.password, function(err, result) {
             // result == true
             // password after hashing === passwprd in database
             if(result === true){
                res.render("secrets");
             }
        });


      }
    }
  });

});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
