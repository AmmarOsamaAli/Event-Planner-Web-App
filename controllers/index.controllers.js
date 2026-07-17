const router = require("express").Router()
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
