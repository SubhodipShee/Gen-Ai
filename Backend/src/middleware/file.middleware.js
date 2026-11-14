const multer = require("multer")



const upload = multer({
    storage:multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024
    }, // 3MB file size limit

    // only PDF resumes are allowed, because pdf-parse can only read PDF files
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            const error = new Error("Only PDF files are allowed")
            error.status = 400
            return cb(error)
        }
        cb(null, true)
    }

})

module.exports = upload