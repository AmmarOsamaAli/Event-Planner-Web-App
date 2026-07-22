const express = require("express");
const router = express.Router();
const User = require("../models/User.js");
const bcrypt = require("bcrypt");


// Sign up routes
router.get("/sign-up", (req, res) => {
  res.render("auth/sign-up.ejs", {errorMessage: null});
});

router.post("/sign-up", async (req, res) => {
  const userInDatabase = await User.findOne({ username: req.body.username });
  if (userInDatabase) {
    return res.status(400).render("auth/sign-up.ejs", {errorMessage: "Username already taken."})
  }

  if (req.body.password !== req.body.confirmPassword) {
    return res.status(400).render("auth/sign-up.ejs", {errorMessage: "Passwords do not match"})
  }

  const hashedPassword = bcrypt.hashSync(req.body.password, 10);
  req.body.password = hashedPassword;

  // validation logic

  const user = await User.create(req.body);
  res.redirect("/auth/log-in");
});



// Sign in routes
router.get("/log-in", (req, res) => {
  res.render("auth/log-in.ejs", {errorMessage: null});
});



router.post("/log-in", async (req, res) => {
  // First, get the user from the database
  const userInDatabase = await User.findOne({ username: req.body.username });
  if (!userInDatabase) {
    return res.status(400).render("auth/log-in.ejs", {errorMessage: "Login failed. Please try again."})
  }

  // There is a user! Time to test their password with bcrypt
  const validPassword = bcrypt.compareSync(
    req.body.password,
    userInDatabase.password
  );
  if (!validPassword) {
    return res.status(400).render("auth/log-in.ejs", {errorMessage: "Login failed. Please try again."})
  }

  // There is a user AND they had the correct password. Time to make a session!
  // Avoid storing the password, even in hashed format, in the session
  // If there is other data you want to save to `req.session.user`, do so here!
  req.session.user = {
    username: userInDatabase.username,
    _id: userInDatabase._id
  };

  res.redirect("/");
});


router.get("/log-out", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});





module.exports = router;
