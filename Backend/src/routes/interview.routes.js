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


/**
 * @route GET /api/interview/report/:interviewId
 * @desc Get the interview report by it InterviewID
 * @access Private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)


/**
 * @route GET /api/interview
 * @desc Get all the interview reports of logged in user
 * @access Private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)

/**
 * @route GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)




module.exports = interviewRouter;