const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const User = require('../models/User.js')
const isSignedIn = require("../middleware/is-signed-in");

router.get('/events/invitations', isSignedIn ,async (req,res)=>{
    const allInvitations = await ParticipationRequest.find({type: "invitation"}).populate("participant")
    .populate({path: 'event', populate: {path: 'eventPlanner'}})
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

    const foundEvent = await Event.findById(req.params._id)

    if(!foundEvent){
        return res.redirect('/events/invitations')
    }

    if(!foundEvent.eventPlanner.equals(req.session.user._id)){
        return res.redirect(`/events/${foundEvent._id}`)
    }

    if(!selectedUser){
        return res.redirect(`/events/${foundEvent._id}/invitations/new`)
    }

    const isAlreadyAttending = foundEvent.attendeesList.some(oneObjecId => {
        return oneObjecId.equals(selectedUser._id)
    })

    if(isAlreadyAttending){
        return res.status(400).send('This user is already attending the event')
    }

    const existingInvitation  = await ParticipationRequest.findOne({
        event: foundEvent._id,
        participant: selectedUser._id,
        type: 'invitation',
    })

    if (existingInvitation) {
        if (
            existingInvitation.status === 'pending' ||
            existingInvitation.status === 'waitlisted' ||
            existingInvitation.status === 'accepted'
        ) {
            return res.status(400).send('This user already has an active invitation')
        }

        if (existingInvitation.status === 'declined') {
            existingInvitation.message = req.body.message
            existingInvitation.status = 'pending'
            await existingInvitation.save()

            return res.redirect('/events/invitations')
        }
    }

    await ParticipationRequest.create({
        message: req.body.message,
        type: "invitation",
        participant: req.body.participant,
        event: req.params.eventsId,
    })
    res.redirect('/events/invitations')
})


router.put('/invitation/:inviteId/accept', isSignedIn, async (req, res) => {

})

router.put('/invitation/:inviteId/decline', isSignedIn, async (req, res) => {
    
})

module.exports = router;
