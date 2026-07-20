const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const isSignedIn = require("../middleware/is-signed-in");

router.get('/events/attendance-requests', isSignedIn, async (req, res) => {
    const foundRequest = await ParticipationRequest.find({ type: "attendanceRequest"}).populate("event participant")
    res.render('attendance-requests/index.ejs', { requests: foundRequest })
})

router.get('/events/:eventId/attendance-requests/new', isSignedIn, async (req, res) => {
    const foundEvent = await Event.findById(req.params.eventId)
    res.render('attendance-requests/new.ejs', { events: foundEvent })
})

router.put('/attendance-requests/:requestId/accept', isSignedIn, async (req, res) => {
    const foundRequest = await ParticipationRequest.findById(req.params.requestId)
    if (foundRequest && 
        (foundRequest.status === "pending" || foundRequest.status === "waitlisted" || foundRequest.status === "declined")) {
        const event = await Event.findById(foundRequest.event)
        if (event && event.eventPlanner.equals(req.session.user._id)) {
            let isAlreadyAttending = false
            for (let oneObjectId of event.attendeesList) {
                if (oneObjectId.equals(foundRequest.participant)) {
                    isAlreadyAttending = true
                    break
                }
            }
            if (isAlreadyAttending) {
                const updatedRequest = await ParticipationRequest.findByIdAndUpdate(
                    req.params.requestId, { status: "accepted" }, { new: true, runValidators: true })
            }
            else if (event.attendeesList.length < event.capacity) {
                event.attendeesList.push(foundRequest.participant)
                await event.save()
                const updatedAcceptRequest = await ParticipationRequest.findByIdAndUpdate(
                    req.params.requestId, { status: "accepted" }, { new: true, runValidators: true })
            }
            else {
                const updatedWaitlistRequest = await ParticipationRequest.findByIdAndUpdate(
                    req.params.requestId, { status: "waitlisted" }, { new: true, runValidators: true })
            }

        }
    }
    res.redirect('/events/attendance-requests')
})

router.put('/attendance-requests/:requestId/decline', isSignedIn ,async (req, res) => {
    const foundRequest = await ParticipationRequest.findById(req.params.requestId)
    if (foundRequest && foundRequest.status !== "declined" ) {
        const event = await Event.findById(foundRequest.event)
        if (event && event.eventPlanner.equals(req.session.user._id)) {
            if(foundRequest.status === "accepted"){
                event.attendeesList = event.attendeesList.filter(oneObjectId => {
                    return !oneObjectId.equals(foundRequest.participant)
                })

                await event.save()
            }
            const updatedDeclineRequest = await ParticipationRequest.findByIdAndUpdate(
            req.params.requestId, { status: "declined" }, { new: true, runValidators: true })
        }
    }
    res.redirect('/events/attendance-requests')
})

router.delete('/attendance-requests/:requestId/cancel', isSignedIn ,async (req,res)=>{
    const foundRequest = await ParticipationRequest.findById(req.params.requestId)
    if(foundRequest && foundRequest.participant.equals(req.session.user._id)){
        if(foundRequest.status === "pending" || foundRequest.status === "waitlisted"){
            const deleteRequest = await ParticipationRequest.findByIdAndDelete(req.params.requestId)
        }
    }
    res.redirect('/events/attendance-requests')
})

router.post('/events/:eventId/attendance-requests', isSignedIn, async (req, res) => {
    const foundEvent = await Event.findById(req.params.eventId)
    if (foundEvent && foundEvent.isPublic && !foundEvent.eventPlanner.equals(req.session.user._id)) {
        let isAlreadyAttending = foundEvent.attendeesList.some((oneObjectId) => {
            return oneObjectId.equals(req.session.user._id)
        })

        const existingRequest = await ParticipationRequest.findOne({
            participant: req.session.user._id,
            event: req.params.eventId,
            type: "attendanceRequest"
        })
        if (existingRequest) {
            if (existingRequest.status === "pending") {
                return res.status(400).send("You already have a pending request")
            }

            if (existingRequest.status === "waitlisted") {
                return res.status(400).send("You are already waitlisted")
            }

            if (existingRequest.status === "accepted") {
                return res.status(400).send("Your request was already accepted")
            }
            if (existingRequest.status === "declined") {
                existingRequest.message = req.body.message
                existingRequest.status = "pending"
                await existingRequest.save()

                return res.redirect('/events')
            }
        }
        else {
            await ParticipationRequest.create({
                message: req.body.message,
                type: "attendanceRequest",
                participant: req.session.user._id,
                event: req.params.eventId
            })
        }
    }

    res.redirect('/events')
})


module.exports = router;
