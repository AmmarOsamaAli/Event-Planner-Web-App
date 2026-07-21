const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const upload = require("../middleware/upload")
const isSignedIn = require("../middleware/is-signed-in");


// GET All Events Page
router.get('/', async (req, res) => {
    let query = req.session.user ? { isPublic: true, eventPlanner: { $ne: req.session.user._id } } : { isPublic: true }
    const allEvents = await Event.find(query).populate('eventPlanner')
    res.render('events/index.ejs', { events: allEvents })
})

// GET Create Event Page
router.get('/new', isSignedIn, (req, res) => {
    res.render('events/new.ejs')
})

router.post('/', isSignedIn, upload.single("image"), async (req, res) => {
    try {
        console.log("Uploaded file:", req.file)
        console.log("Form body:", req.body)
        req.body.isPublic = Boolean(req.body.isPublic)
        let submittedCategories = req.body.categories
        if (submittedCategories === undefined) {
            return res.status(400).send("Please select at least one category")
        }
        if (!Array.isArray(submittedCategories))
            submittedCategories = [submittedCategories]
        
        const newEvent = await Event.create({
            title: req.body.title,
            description: req.body.description,
            image: req.file
            ? `/uploads/events/${req.file.filename}`
            : null,
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

router.get('/:eventId/edit', isSignedIn, async (req, res) => {
    const foundEvent = await Event.findById(req.params.eventId)
    res.render('events/edit.ejs', { events: foundEvent })
})

router.put('/:eventId', isSignedIn, async (req, res) => {
    req.body.isPublic = Boolean(req.body.isPublic)
    let submittedCategories = req.body.categories
    if (submittedCategories === undefined) {
        return res.status(400).send("Please select at least one category")
    }
    if (!Array.isArray(submittedCategories))
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

router.delete('/:eventId', isSignedIn, async (req, res) => {
    const deletedEvent = await Event.findByIdAndDelete(req.params.eventId)
    res.redirect('/events/my-events')
})

router.delete('/:eventId/leave', isSignedIn, async (req, res) => {
    const currentUserId = req.session.user._id
    const foundEvent = await Event.findById(req.params.eventId)

    if (!foundEvent) {
        res.redirect('/events/attending-events')
    }

    const isAttending = foundEvent.attendeesList.some(oneObjectId => {
        return oneObjectId.equals(currentUserId)
    })

    if (isAttending) {
        foundEvent.attendeesList = foundEvent.attendeesList.filter(oneObjectId => {
            return !oneObjectId.equals(currentUserId)
        })

        await foundEvent.save()


        const foundRequest = await ParticipationRequest.findOne({
            event: foundEvent._id,
            participant: req.session.user._id,
            type: "attendanceRequest",
            status: "accepted"
        })

        if (foundRequest) {
            foundRequest.status = "declined"
            await foundRequest.save()
        }
    }

    res.redirect('/events/attending-events')
})

router.get('/my-events', isSignedIn, async (req, res) => {
    const myEvent = await Event.find({ eventPlanner: req.session.user._id })
    res.render('events/my-events.ejs', { events: myEvent })
})

router.get('/attending-events', isSignedIn, async (req, res) => {
    const currentUser = req.session.user._id
    const myEvent = await Event.find({ attendeesList: currentUser }).populate("eventPlanner attendeesList")
    res.render('events/attending-events.ejs', { events: myEvent, user: req.session.user })
})

router.get('/:eventId', isSignedIn, async (req, res) => {
    const foundEvent = await Event.findById(req.params.eventId).populate("eventPlanner attendeesList")
    const foundRequest = await ParticipationRequest.find({
        event: foundEvent._id,
        type: "attendanceRequest",
        status: "waitlisted"
    }).populate("participant")

    const userRequest = await ParticipationRequest.findOne({
        event: foundEvent._id,
        participant: req.session.user._id,
        type: 'attendanceRequest',
    })

    res.render('events/details.ejs', { events: foundEvent, requests: foundRequest, userRequest: userRequest })
})


module.exports = router;
