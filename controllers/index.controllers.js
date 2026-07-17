const router = require("express").Router()


router.get('/',(req,res)=>{
    res.render('homepage.ejs')
})

router.get('/dashboard', (req,res)=>{
    res.render('dashboard.ejs')
})

router.get('/profile', (req,res)=>{
    res.render('profile.ejs')
})

module.exports = router;
