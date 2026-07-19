const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const isSignedIn = require("../middleware/is-signed-in");


router.get('/',(req,res)=>{
    res.render('homepage.ejs')
})

router.get('/dashboard', isSignedIn ,(req,res)=>{
    res.render('dashboard.ejs')
})

router.get('/profile', isSignedIn , (req,res)=>{
    res.render('profile.ejs')
})

module.exports = router;
