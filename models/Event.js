const mongoose = require('mongoose')


const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100,
    },
    description: {
        type: String,
        trim: true,
        maxLength: 1000,
    },
    image: {
        type: String,
        required: true,
        trim: true,
    },
    isPublic: {
        type: Boolean,
        required: true,
    },
    categories: {
        type: [String],
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    location: {
        type: String,
        trim: true,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        // min: 5,
    },
    attendeesList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    eventPlanner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
}, {timestamps: true})


const Event = mongoose.model('Event', eventSchema)


module.exports = Event