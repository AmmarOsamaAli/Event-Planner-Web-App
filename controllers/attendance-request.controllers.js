const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const isSignedIn = require("../middleware/is-signed-in");



router.get('/events/:eventId/attendance-requests/new', isSignedIn, async (req,res)=>{
    const foundEvent = await Event.findById(req.params.eventId)
    res.render('attendance-requests/new.ejs', {events: foundEvent})
})

router.post('/events/:eventId/attendance-requests', isSignedIn, async (req,res)=>{
    const createRequest = ParticipationRequest.create({
        message: req.body.message,
        status: "pending",
        type: "attendanceRequest",
        participant: req.session.user._id,
        event: req.params.eventId
    })
    res.redirect('/events')
})


module.exports = router;
