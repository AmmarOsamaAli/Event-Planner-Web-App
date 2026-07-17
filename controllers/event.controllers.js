const router = require("express").Router()
const Event = require("../models/Event")

// GET All Events Page
router.get('/', async (req,res)=>{
    const allEvents = await Event.find().populate('eventPlanner')
    res.render('events/index.ejs', {events: allEvents})
})

// GET Create Event Page
router.get('/new', (req,res)=>{
    res.render('events/new.ejs')
})

router.post('/', async (req,res)=>{
    try {
        req.body.isPublic = Boolean(req.body.isPublic)
        let submittedCategories = req.body.categories
        if(submittedCategories === undefined){
            return res.status(400).send("Please select at least one category")
        }
        if(!Array.isArray(submittedCategories))
            submittedCategories = [submittedCategories]

        const newEvent = await Event.create({
            title: req.body.title,
            description: req.body.description,
            image: req.body.image,
            isPublic: req.body.isPublic,
            categories: submittedCategories,
            date: new Date(req.body.date),
            location: req.body.location,
            capacity: req.body.capacity,
            attendeesList: [],
            eventPlanner: req.session.user._id
        })
        res.redirect('/events')
    } catch (error) {
        console.log("Error:", error)
    }
    
})


module.exports = router;
