const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const User = require('../models/User.js')
const isSignedIn = require("../middleware/is-signed-in");

router.get('/events/invitations', isSignedIn ,async (req,res)=>{
    const allInvitations = await ParticipationRequest.find({type: "invitation"})
    res.render('invitations/index.ejs', {invitations: allInvitations, user: req.session.user})
})


router.get('/events/:eventsId/invitations/new', isSignedIn ,async (req,res)=>{
    const foundEvent = await Event.findById(req.params.eventsId)
    if(!foundEvent){
        return res.redirect('/events/invitations')
    }

    if(!foundEvent.eventPlanner.equals(req.session.user._id)){
        return res.redirect(`/events/${foundEvent._id}`)
    }

    const excludedUsers = [
        foundEvent.eventPlanner,
        ...foundEvent.attendeesList
    ]

    const users = await User.find({_id: { $nin: excludedUsers }})

    res.render('invitations/new.ejs', { events: foundEvent, users })
})

router.post('/events/:eventsId/invitations', isSignedIn, async (req,res)=>{
    const foundInvitation = await ParticipationRequest.create({
        message: req.body.message,
        type: "invitation",
        participant: req.body.participant,
        event: req.params.eventsId,
    })

    res.redirect('/events/invitations')
})


module.exports = router;
