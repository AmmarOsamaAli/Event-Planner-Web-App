const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const User = require('../models/User.js')
const isSignedIn = require("../middleware/is-signed-in");

router.get('/events/invitations', isSignedIn, async (req, res) => {
    try {
        const ownedEvents = await Event.find({
            eventPlanner: req.session.user._id
        }).select("_id")

        const ownedEventIds = ownedEvents.map(event => event._id)

        const allInvitations = await ParticipationRequest.find({
            type: "invitation",
            $or: [
                { participant: req.session.user._id },
                { event: { $in: ownedEventIds } }
            ]
        }).populate("participant").populate({ path: 'event', populate: { path: 'eventPlanner' } })
        res.render('invitations/index.ejs', { invitations: allInvitations, user: req.session.user })

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not get invitations")
    }
})


router.get('/events/:eventId/invitations/new', isSignedIn, async (req, res) => {
    try {
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

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not get send invitation page")
    }
})

router.post('/events/:eventId/invitations', isSignedIn, async (req, res) => {
    try {
        const foundEvent = await Event.findById(req.params.eventId)

        if (!foundEvent) {
            return res.redirect('/events/invitations')
        }

        if (!foundEvent.eventPlanner.equals(req.session.user._id)) {
            return res.redirect(`/events/${foundEvent._id}`)
        }

        const selectedUser = await User.findById(req.body.participant)

        if (!selectedUser) {
            return res.redirect(`/events/${foundEvent._id}/invitations/new`)
        }

        if (selectedUser._id.equals(foundEvent.eventPlanner)) {
            return res.status(400).send("You cannot invite yourself")
        }

        const isAlreadyAttending = foundEvent.attendeesList.some(oneObjecId => {
            return oneObjecId.equals(selectedUser._id)
        })

        if (isAlreadyAttending) {
            return res.status(400).send('This user is already attending the event')
        }

        const existingParticipation = await ParticipationRequest.findOne({
            event: foundEvent._id,
            participant: selectedUser._id,
        })

        if (existingParticipation) {
            if (existingParticipation.type === "attendanceRequest") {
                return res.status(400).send(
                    "This user already has an attendance request for this event"
                )
            }

            if (
                existingParticipation.status === 'pending' ||
                existingParticipation.status === 'waitlisted' ||
                existingParticipation.status === 'accepted'
            ) {
                return res.status(400).send('This user already has an active invitation')
            }

            if (existingParticipation.status === 'declined' && existingParticipation.type === "invitation") {
                existingParticipation.message = req.body.message
                existingParticipation.status = 'pending'
                await existingParticipation.save()

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

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not get send invitation")
    }
})


router.put('/invitations/:inviteId/accept', isSignedIn, async (req, res) => {
    try {
        const foundRequest = await ParticipationRequest.findById(req.params.inviteId)
        if (foundRequest &&
            (foundRequest.status === "pending" || foundRequest.status === "waitlisted" || foundRequest.status === "declined") &&
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
                    await ParticipationRequest.findByIdAndUpdate(
                        req.params.inviteId, { status: "accepted" }, { new: true, runValidators: true })
                }
                else if (foundEvent.attendeesList.length < foundEvent.capacity) {
                    foundEvent.attendeesList.push(foundRequest.participant)
                    await foundEvent.save()
                    await ParticipationRequest.findByIdAndUpdate(
                        req.params.inviteId, { status: "accepted" }, { new: true, runValidators: true })
                }
                else {
                    await ParticipationRequest.findByIdAndUpdate(
                        req.params.inviteId, { status: "waitlisted" }, { new: true, runValidators: true })
                }

            }
        }
        res.redirect('/events/invitations')


    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not get accept invitation")
    }
})

router.put('/invitations/:inviteId/decline', isSignedIn, async (req, res) => {
    try {
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
                await ParticipationRequest.findByIdAndUpdate(
                    req.params.inviteId, { status: "declined" }, { new: true, runValidators: true })
            }
        }
        res.redirect('/events/invitations')

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not get decline invitation")
    }
})

router.delete('/invitations/:inviteId/cancel', isSignedIn, async (req, res) => {
    try {
        const foundRequest = await ParticipationRequest.findById(req.params.inviteId)
        if (foundRequest && foundRequest.type === "invitation") {
            const foundEvent = await Event.findById(foundRequest.event)
            if (foundEvent && foundEvent.eventPlanner.equals(req.session.user._id)) {
                if (foundRequest.status === "pending" || foundRequest.status === "waitlisted") {
                    await ParticipationRequest.findByIdAndDelete(req.params.inviteId)
                }
            }
        }
        res.redirect('/events/invitations')

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not get cancel invitation")
    }
})

module.exports = router;
