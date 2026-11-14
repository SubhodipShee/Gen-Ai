const mongoose = require("mongoose")
const pdfParse = require("pdf-parse")
const {generateInterviewReport, generateResumeHtml, generatePdfFromHtml} = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")


/**
 * @description Generate an interview report based on the user's resume, self description and the job description using AI
 * 
 * 
 */
async function generateInterviewReportController(req, res) {

    try {
        const { selfDescription, jobDescription } = req.body

        if (!jobDescription) {
            return res.status(400).json({
                message: "Job description is required"
            })
        }

        // either a resume or a self description is enough to generate the report
        if (!req.file && !selfDescription) {
            return res.status(400).json({
                message: "Please upload a resume or add a self description"
            })
        }

        let resumeText = ""
        if (req.file) {
            const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
            resumeText = resumeContent.text
        }

        const interviewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interviewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport 
        })
    } catch (error) {
        console.error('Error generating interview report:', error)
        res.status(500).json({ 
            message: "Error generating interview report",
            error: error.message
        })
    }

}

/**
 * @description Controller to get the interview report by its ID
 */
async function getInterviewReportByIdController(req, res) {
    
    const { interviewId } = req.params
    
    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id }).select("-resumeHtml").lean()

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found"
        })
    }
    res.status(200).json({
        message: "Interview report retrieved successfully", 
        interviewReport })
}

/**
 * @description Controller to get all the interview reports of the user
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan -resumeHtml").lean()
    res.status(200).json({
        message: "Interview reports retrieved successfully",
        interviewReports
    })
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    // only the owner of the report can generate a resume from it
    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id }).lean()

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    // call Gemini only the first time, after that reuse the saved html
    let { resumeHtml } = interviewReport
    if (!resumeHtml) {
        resumeHtml = await generateResumeHtml({ resume, jobDescription, selfDescription })
        await interviewReportModel.updateOne({ _id: interviewReport._id }, { resumeHtml })
    }

    const pdfBuffer = await generatePdfFromHtml(resumeHtml)

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

/**
 * @description Controller to delete an interview report of the logged in user
 */
async function deleteInterviewReportController(req, res) {
    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOneAndDelete({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found"
        })
    }

    res.status(200).json({
        message: "Interview report deleted successfully"
    })
}

/**
 * @description Controller to tick or untick a task of the preparation plan and update the progress percentage
 */
async function updatePlanProgressController(req, res) {
    const { interviewId } = req.params
    const { dayIndex, taskIndex, done } = req.body

    if (!Number.isInteger(dayIndex) || !Number.isInteger(taskIndex) || typeof done !== "boolean") {
        return res.status(400).json({
            message: "dayIndex, taskIndex and done are required"
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id }).select("preparationPlan").lean()

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found"
        })
    }

    const day = interviewReport.preparationPlan[dayIndex]

    if (!day || taskIndex < 0 || taskIndex >= day.tasks.length) {
        return res.status(400).json({
            message: "Task not found in the preparation plan"
        })
    }

    // $addToSet / $pull change only this one list, so quick clicks on different tasks don't overwrite each other
    const taskPath = `preparationPlan.${dayIndex}.completedTasks`
    const updatedReport = await interviewReportModel.findOneAndUpdate(
        { _id: interviewId, user: req.user.id },
        done ? { $addToSet: { [taskPath]: taskIndex } } : { $pull: { [taskPath]: taskIndex } },
        { new: true }
    ).select("preparationPlan").lean()

    // progress = ticked tasks out of all tasks
    const totalTasks = updatedReport.preparationPlan.reduce((sum, d) => sum + d.tasks.length, 0)
    const doneTasks = updatedReport.preparationPlan.reduce((sum, d) => sum + (d.completedTasks?.length || 0), 0)
    const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

    await interviewReportModel.updateOne({ _id: interviewId }, { progress })

    res.status(200).json({
        message: "Progress updated successfully",
        preparationPlan: updatedReport.preparationPlan,
        progress
    })
}

/**
 * @description Controller to save the confidence check of a question and schedule when it comes back for revision
 */
async function updateQuestionReviewController(req, res) {
    const { interviewId } = req.params
    const { type, index, confidence, knewIt } = req.body

    const validConfidence = confidence === undefined || confidence === null || (Number.isInteger(confidence) && confidence >= 1 && confidence <= 5)

    if (![ "technical", "behavioral" ].includes(type) || !Number.isInteger(index) || typeof knewIt !== "boolean" || !validConfidence) {
        return res.status(400).json({
            message: "type, index and knewIt are required, confidence must be 1 to 5"
        })
    }

    const field = type === "technical" ? "technicalQuestions" : "behavioralQuestions"

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id }).select(field).lean()

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found"
        })
    }

    const question = interviewReport[field][index]

    if (!question) {
        return res.status(400).json({
            message: "Question not found"
        })
    }

    // didn't know it -> back tomorrow, knew it -> 3 days, knew it again -> 7 days
    const box = knewIt ? Math.min((question.box || 0) + 1, 2) : 0
    const days = !knewIt ? 1 : box === 1 ? 3 : 7
    const nextReviewAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    const review = { confidence: confidence ?? null, knewIt, box, nextReviewAt }

    await interviewReportModel.updateOne({ _id: interviewId, user: req.user.id }, {
        $set: {
            [`${field}.${index}.confidence`]: review.confidence,
            [`${field}.${index}.knewIt`]: review.knewIt,
            [`${field}.${index}.box`]: review.box,
            [`${field}.${index}.nextReviewAt`]: review.nextReviewAt
        }
    })

    res.status(200).json({
        message: "Question review saved successfully",
        question: { ...question, ...review }
    })
}

/**
 * @description Controller to find the skill gaps that repeat across all the interview reports of the user (Career Gap Radar)
 */
async function getInterviewInsightsController(req, res) {
    const severityRank = { $switch: {
        branches: [
            { case: { $eq: [ "$skillGaps.severity", "high" ] }, then: 3 },
            { case: { $eq: [ "$skillGaps.severity", "medium" ] }, then: 2 }
        ],
        default: 1
    } }

    // aggregate does not convert the id string by itself, so it is converted here
    const skillGaps = await interviewReportModel.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
        { $unwind: "$skillGaps" },
        { $group: {
            _id: { $toLower: { $trim: { input: "$skillGaps.skill" } } }, // "Docker" and "docker " count as the same skill
            skill: { $min: { $trim: { input: "$skillGaps.skill" } } }, // trimmed name, $min prefers the capitalised spelling ("Docker" over "docker")
            reports: { $addToSet: "$_id" },
            rank: { $max: severityRank }
        } },
        { $project: {
            _id: 0,
            skill: 1,
            jobCount: { $size: "$reports" },
            rank: 1
        } },
        { $sort: { jobCount: -1, rank: -1, skill: 1 } },
        { $limit: 6 }
    ])

    const totalReports = await interviewReportModel.countDocuments({ user: req.user.id })

    res.status(200).json({
        message: "Interview insights retrieved successfully",
        totalReports,
        skillGaps: skillGaps.map(({ rank, ...gap }) => ({ ...gap, severity: rank === 3 ? "high" : rank === 2 ? "medium" : "low" }))
    })
}

module.exports = {generateInterviewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController, deleteInterviewReportController, updatePlanProgressController, updateQuestionReviewController, getInterviewInsightsController}