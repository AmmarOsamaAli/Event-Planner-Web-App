const router = require("express").Router()
const Event = require("../models/Event")
const ParticipationRequest = require("../models/ParticipationRequest")
const upload = require("../middleware/upload")
const fs = require("fs")
const path = require("path")
const isSignedIn = require("../middleware/is-signed-in");

// Function to Delete Uploaded File
const deleteUploadedFile = file => {
    if (!file) return

    fs.unlink(file.path, error => {
        if (error && error.code !== "ENOENT") {
            console.log("File cleanup error:", error)
        }
    })
}


// GET All Events Page
router.get('/', async (req, res) => {
    try {
        let query = req.session.user ? { isPublic: true, eventPlanner: { $ne: req.session.user._id } } : { isPublic: true }
        const allEvents = await Event.find(query).populate('eventPlanner')
        res.render('events/index.ejs', { events: allEvents })

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could Not All Events")
    }
})

// GET Create Event Page
router.get('/new', isSignedIn, (req, res) => {
    res.render('events/new.ejs')
})


// POST Request to Create Event
router.post('/', isSignedIn, upload.single("image"), async (req, res) => {
    try {
        req.body.isPublic = Boolean(req.body.isPublic)
        let submittedCategories = req.body.categories

        if (submittedCategories === undefined) {
            deleteUploadedFile(req.file)
            return res.status(400).send("Please select at least one category")
        }
        if (!Array.isArray(submittedCategories))
            submittedCategories = [submittedCategories]

        await Event.create({
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
        deleteUploadedFile(req.file)
        console.log("Error:", error)
        return res.status(500).send("Could Not Create Event")
    }

})

// GET Edit Event Page
router.get('/:eventId/edit', isSignedIn, async (req, res) => {
    try {
        const foundEvent = await Event.findById(req.params.eventId)

        if (!foundEvent) {
            return res.redirect('/events/my-events')
        }

        if (!foundEvent.eventPlanner.equals(req.session.user._id)) {
            return res.status(403).send(
                "You are not allowed to edit this event"
            )
        }
        res.render('events/edit.ejs', { events: foundEvent })

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could Not Get Edit Event Page")
    }
})


// PUT Route to Update Event
router.put('/:eventId', isSignedIn, upload.single("image"), async (req, res) => {
    try {
        const foundEvent = await Event.findById(req.params.eventId)

        if (!foundEvent) {
            deleteUploadedFile(req.file)
            return res.redirect('/events')
        }

        if (!foundEvent.eventPlanner.equals(req.session.user._id)) {
            deleteUploadedFile(req.file)
            return res.status(403).send(
                "You are not allowed to edit this event"
            )
        }

        req.body.isPublic = Boolean(req.body.isPublic)

        let submittedCategories = req.body.categories

        if (submittedCategories === undefined) {
            deleteUploadedFile(req.file)
            return res.status(400).send("Please select at least one category")
        }
        if (!Array.isArray(submittedCategories))
            submittedCategories = [submittedCategories]

        const oldImagePath = foundEvent.image
        let imagePath = oldImagePath


        if (req.file) {
            imagePath = `/uploads/events/${req.file.filename}`
        }

        const newCapacity = Number(req.body.capacity)

        if (newCapacity < foundEvent.attendeesList.length) {
            deleteUploadedFile(req.file)

            return res.status(400).send(
                "Capacity cannot be lower than the current number of attendees"
            )
        }

        await Event.findByIdAndUpdate(req.params.eventId, {
            title: req.body.title,
            description: req.body.description,
            image: imagePath,
            isPublic: req.body.isPublic,
            categories: submittedCategories,
            date: new Date(req.body.date),
            location: req.body.location,
            capacity: newCapacity,
        },
            {
                runValidators: true
            })

        if (
            req.file &&
            oldImagePath &&
            oldImagePath.startsWith('/uploads/events/')
        ) {
            const fullOldImagePath = path.join(
                process.cwd(),
                'public',
                oldImagePath.replace(/^\/+/, '')
            )

            fs.unlink(fullOldImagePath, error => {
                if (error && error.code !== 'ENOENT') {
                    console.log('Old image deletion error:', error)
                }
            })
        }
    } catch (error) {
        deleteUploadedFile(req.file)
        console.log("Error:", error)
        return res.status(500).send("Could not update event")
    }

    res.redirect('/events')
})


// DELETE Route to Delete Event
router.delete('/:eventId', isSignedIn, async (req, res) => {
    try {
        const foundEvent = await Event.findById(req.params.eventId)
        if (!foundEvent) {
            return res.redirect('/events/my-events')
        }

        if (!foundEvent.eventPlanner.equals(req.session.user._id)) {
            return res.status(403).send('You are not allowed to delete this event')
        }

        await ParticipationRequest.deleteMany({ event: foundEvent._id })

        await Event.findByIdAndDelete(foundEvent._id)

        if (
            foundEvent.image &&
            foundEvent.image.startsWith('/uploads/events/')
        ) {
            const imagePath = path.join(process.cwd(), 'public',
                foundEvent.image.replace(/^\/+/, ''))

            fs.unlink(imagePath, error => {
                if (error && error.code !== 'ENOENT') {
                    console.log(error)
                }
            })
        }
        res.redirect('/events/my-events')

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could Not Delete Event")
    }
})

// DELETE Route to Leave Event 
router.delete('/:eventId/leave', isSignedIn, async (req, res) => {
    try {
        const currentUserId = req.session.user._id
        const foundEvent = await Event.findById(req.params.eventId)

        if (!foundEvent) {
            return res.redirect('/events/attending-events')
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
                status: "accepted"
            })

            if (foundRequest) {
                foundRequest.status = "declined"
                await foundRequest.save()
            }
        }
        res.redirect('/events/attending-events')

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could Not Leave Event")
    }
})


// GET Route for all Events The Logged in user Created
router.get('/my-events', isSignedIn, async (req, res) => {
    try {
        const myEvent = await Event.find({ eventPlanner: req.session.user._id })
        res.render('events/my-events.ejs', { events: myEvent })

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could Not Get My Event")
    }
})

// GET Route for all Events The Logged in user is a part of
router.get('/attending-events', isSignedIn, async (req, res) => {
    try {
        const currentUser = req.session.user._id
        const myEvent = await Event.find({ attendeesList: currentUser }).populate("eventPlanner attendeesList")
        res.render('events/attending-events.ejs', { events: myEvent, user: req.session.user })

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could not attending events")
    }
})

// GET Route for event Details Page
router.get('/:eventId', isSignedIn, async (req, res) => {
    try {
        const foundEvent = await Event.findById(req.params.eventId).populate("eventPlanner attendeesList")

        if (!foundEvent) {
            return res.redirect('/events')
        }

        if (!foundEvent.isPublic) {
            const currentUserId = req.session.user._id

            const isPlanner =
                foundEvent.eventPlanner._id.equals(currentUserId)

            const isAttendee = foundEvent.attendeesList.some(attendee => {
                return attendee._id.equals(currentUserId)
            })

            const invitation = await ParticipationRequest.findOne({
                event: foundEvent._id,
                participant: currentUserId,
                type: "invitation"
            })

            if (!isPlanner && !isAttendee && !invitation) {
                return res.status(403).send(
                    "You are not allowed to view this private event"
                )
            }
        }

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

    } catch (error) {
        console.log("Error:", error)
        return res.status(500).send("Could Not Get Event Details")
    }
})


module.exports = router;
