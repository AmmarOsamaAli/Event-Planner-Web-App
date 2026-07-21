const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
    destination: "./public/uploads/events",

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname)

        cb(
            null,
            `${file.fieldname}_${Date.now()}${extension}`
        )
    }
})

const upload = multer({ storage })

module.exports = upload