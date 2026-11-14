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
 * @route DELETE /api/interview/report/:interviewId
 * @desc Delete the interview report of the logged in user
 * @access Private
 */
interviewRouter.delete("/report/:interviewId", authMiddleware.authUser, interviewController.deleteInterviewReportController)


/**
 * @route PATCH /api/interview/report/:interviewId/progress
 * @desc Tick or untick a task of the preparation plan, expects dayIndex, taskIndex and done in the request body
 * @access Private
 */
interviewRouter.patch("/report/:interviewId/progress", authMiddleware.authUser, interviewController.updatePlanProgressController)


/**
 * @route PATCH /api/interview/report/:interviewId/question
 * @desc Save the confidence check of a question and schedule its next revision, expects type, index, knewIt and optional confidence in the request body
 * @access Private
 */
interviewRouter.patch("/report/:interviewId/question", authMiddleware.authUser, interviewController.updateQuestionReviewController)


/**
 * @route GET /api/interview/insights
 * @desc Get the skill gaps that repeat across all the interview reports of the logged in user
 * @access Private
 */
interviewRouter.get("/insights", authMiddleware.authUser, interviewController.getInterviewInsightsController)


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