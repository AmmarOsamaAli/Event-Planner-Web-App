const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const User = require('../models/User.js')
const isSignedIn = require("../middleware/is-signed-in");

router.get('/events/invitations', isSignedIn, async (req, res) => {
    const allInvitations = await ParticipationRequest.find({ type: "invitation" }).populate("participant")
        .populate({ path: 'event', populate: { path: 'eventPlanner' } })
    res.render('invitations/index.ejs', { invitations: allInvitations, user: req.session.user })
})


router.get('/events/:eventId/invitations/new', isSignedIn, async (req, res) => {
    const foundEvent = await Event.findById(req.params.eventId)
    if (!foundEvent) {
        return res.redirect('/events/invitations')
    }

    if (!foundEvent.eventPlanner.equals(req.session.user._id)) {
        return res.redirect(`/events/${foundEvent._id}`)
    }

    const excludedUsers = [
        foundEvent.eventPlanner,
        ...foundEvent.attendeesList
    ]

    const users = await User.find({ _id: { $nin: excludedUsers } })

    res.render('invitations/new.ejs', { events: foundEvent, users })
})

router.post('/events/:eventId/invitations', isSignedIn, async (req, res) => {

    const foundEvent = await Event.findById(req.params.eventId)

    if (!foundEvent) {
        return res.redirect('/events/invitations')
    }

    if (!foundEvent.eventPlanner.equals(req.session.user._id)) {
        return res.redirect(`/events/${foundEvent._id}`)
    }

    const selectedUser = await User.findById(req.body.participant)

    if (selectedUser._id.equals(foundEvent.eventPlanner)) {
        return res.status(400).send("You cannot invite yourself")
    }

    if (!selectedUser) {
        return res.redirect(`/events/${foundEvent._id}/invitations/new`)
    }

    const isAlreadyAttending = foundEvent.attendeesList.some(oneObjecId => {
        return oneObjecId.equals(selectedUser._id)
    })

    if (isAlreadyAttending) {
        return res.status(400).send('This user is already attending the event')
    }

    const existingInvitation = await ParticipationRequest.findOne({
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
        participant: selectedUser._id,
        event: foundEvent._id,
    })
    res.redirect('/events/invitations')
})


router.put('/invitations/:inviteId/accept', isSignedIn, async (req, res) => {
    const foundRequest = await ParticipationRequest.findById(req.params.inviteId)
    if (foundRequest &&
        (foundRequest.status === "pending" || foundRequest.status === "waitlisted") &&
        foundRequest.type === "invitation") {
        const foundEvent = await Event.findById(foundRequest.event)
        if (foundEvent && foundRequest.participant.equals(req.session.user._id)) {
            let isAlreadyAttending = false
            for (let oneObjectId of foundEvent.attendeesList) {
                if (oneObjectId.equals(foundRequest.participant)) {
                    isAlreadyAttending = true
                    break
                }
            }
            if (isAlreadyAttending) {
                const updatedRequest = await ParticipationRequest.findByIdAndUpdate(
                    req.params.inviteId, { status: "accepted" }, { new: true, runValidators: true })
            }
            else if (foundEvent.attendeesList.length < foundEvent.capacity) {
                foundEvent.attendeesList.push(foundRequest.participant)
                await foundEvent.save()
                const updatedAcceptRequest = await ParticipationRequest.findByIdAndUpdate(
                    req.params.inviteId, { status: "accepted" }, { new: true, runValidators: true })
            }
            else {
                const updatedWaitlistRequest = await ParticipationRequest.findByIdAndUpdate(
                    req.params.inviteId, { status: "waitlisted" }, { new: true, runValidators: true })
            }

        }
    }
    res.redirect('/events/invitations')
})

router.put('/invitations/:inviteId/decline', isSignedIn, async (req, res) => {
    const foundRequest = await ParticipationRequest.findById(req.params.inviteId)
    if (foundRequest && foundRequest.status !== "declined" && foundRequest.type === "invitation") {
        const foundEvent = await Event.findById(foundRequest.event)
        if (foundEvent && foundRequest.participant.equals(req.session.user._id)) {
            if (foundRequest.status === "accepted") {
                foundEvent.attendeesList = foundEvent.attendeesList.filter(oneObjectId => {
                    return !oneObjectId.equals(foundRequest.participant)
                })

                await foundEvent.save()
            }
            const updatedDeclineRequest = await ParticipationRequest.findByIdAndUpdate(
                req.params.inviteId, { status: "declined" }, { new: true, runValidators: true })
        }
    }
    res.redirect('/events/invitations')
})

router.delete('/invitations/:inviteId/cancel', isSignedIn, async (req, res) => {
    const foundRequest = await ParticipationRequest.findById(req.params.inviteId)
    if (foundRequest && foundRequest.type === "invitation") {
        const foundEvent = await Event.findById(foundRequest.event)
        if (foundEvent && foundEvent.eventPlanner.equals(req.session.user._id)) {
            if (foundRequest.status === "pending" || foundRequest.status === "waitlisted") {
                const deleteRequest = await ParticipationRequest.findByIdAndDelete(req.params.inviteId)
            }
        }
    }
    res.redirect('/events/invitations')
})

module.exports = router;
