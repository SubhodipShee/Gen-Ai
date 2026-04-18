const express = require('express')
const authMiddleware = require("../middleware/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middleware/file.middleware")


const interviewRouter = express.Router()


/**
 * @route POST /api/interview
 * @desc Create a new interview report on the basis of the provided user self description and the job description
 * @access Private
 */
interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterviewReportController) 


module.exports = interviewRouter;