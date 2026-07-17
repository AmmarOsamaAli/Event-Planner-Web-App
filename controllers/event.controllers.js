const router = require("express").Router()
const Event = require("../models/Event")
const isSignedIn = require("../middleware/is-signed-in");

// GET All Events Page
router.get('/', async (req,res)=>{
    const allEvents = await Event.find().populate('eventPlanner')
    res.render('events/index.ejs', {events: allEvents})
})

// GET Create Event Page
router.get('/new', isSignedIn ,(req,res)=>{
    res.render('events/new.ejs')
})

router.post('/', isSignedIn ,async (req,res)=>{
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

router.get('/:eventId/edit', isSignedIn ,async (req,res)=>{
    const foundEvent = await Event.findById(req.params.eventId)
    res.render('events/edit.ejs', {events: foundEvent})
})

router.put('/:eventId', isSignedIn ,async (req,res)=>{
    req.body.isPublic = Boolean(req.body.isPublic)
    let submittedCategories = req.body.categories
        if(submittedCategories === undefined){
            return res.status(400).send("Please select at least one category")
        }
        if(!Array.isArray(submittedCategories))
            submittedCategories = [submittedCategories]
        
    const updatedEvent = await Event.findByIdAndUpdate(req.params.eventId, {
        title: req.body.title,
        description: req.body.description,
        image: req.body.image,
        isPublic: req.body.isPublic,
        categories: submittedCategories,
        date: new Date(req.body.date),
        location: req.body.location,
        capacity: req.body.capacity,
    })
    res.redirect('/events')
})

router.delete('/:eventId', isSignedIn ,async (req,res)=>{
    const deletedEvent = await Event.findByIdAndDelete(req.params.eventId)
    res.redirect('/events')
})

router.get('/my-events', isSignedIn ,async (req,res)=>{
    const myEvent = await Event.find({eventPlanner: req.session.user._id})
    res.render('events/my-events.ejs', {events: myEvent})
})

router.get('/attending-events', isSignedIn ,async (req,res)=>{
    const myEvent = await Event.find()  // ADD EVEnts where you are in attendee List
    res.render('events/attending-events.ejs', {events: myEvent})
})

router.get ('/:eventId', isSignedIn ,async (req,res)=>{
    const foundEvent = await Event.findById(req.params.eventId).populate("eventPlanner")
    res.render('events/details.ejs', {events: foundEvent})
})


module.exports = router;
