import {getAllInterviewReports, getInterviewReportById, generateInterviewReport, generateResumePdf, generateCheatSheetPdf, deleteInterviewReport, updatePlanProgress, updateQuestionReview, getInterviewInsights} from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"

// saves a pdf blob from the server as a file download
const downloadPdf = (data, fileName) => {
    const url = window.URL.createObjectURL(new Blob([ data ], { type: "application/pdf" }))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", fileName)
    document.body.appendChild(link)
    link.click()

    // clean up the temporary link and file url after the download starts
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

// the reason sent by the server (e.g. "too many reports"), pdf requests get it back as a blob
const getErrorMessage = async (error) => {
    const data = error.response?.data
    if (data instanceof Blob) {
        try {
            return JSON.parse(await data.text()).message
        } catch {
            return undefined
        }
    }
    return data?.message
}


export const useInterview = () => {

 const context = useContext(InterviewContext)
 const { interviewId } = useParams()

    if (!context) {
        throw new Error('useInterview must be used within a InterviewProvider')
    }

    const { loading, setLoading, report, setReport, reports, setReports, insights, setInsights } = context

    // returns { report } or { message } with the reason from the server
    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return { report: response.interviewReport }
        } catch (error) {
            console.error('Error generating report:', error)
            return { message: await getErrorMessage(error) }
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (interviewId) => {
        // the report is already in state (for example right after generating it), no need to fetch again
        if (report?._id === interviewId) {
            return report
        }

        setLoading(true)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
        return response?.interviewReport || null
    }

     // no page-wide loading here, the list just shows up when it is ready instead of hiding the whole Home page
     const getReports = async () => {
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response.interviewReports)
        } catch (error) {
            console.log(error)
        }

        return response?.interviewReports || []
    }

    // returns { success, message }
    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        let response = null
        try {
            response = await generateResumePdf({ interviewReportId })
            downloadPdf(response, `resume_${interviewReportId}.pdf`)
            return { success: true }
        }
        catch (error) {
            console.log(error)
            return { success: false, message: await getErrorMessage(error) }
        } finally {
            setLoading(false)
        }
    }

    // the cheat sheet is quick (no AI), so no page-wide loading, the page shows its own "Preparing..." text
    // returns { success, message }
    const getCheatSheetPdf = async (interviewReportId) => {
        try {
            const response = await generateCheatSheetPdf({ interviewReportId })
            downloadPdf(response, `cheatsheet_${interviewReportId}.pdf`)
            return { success: true }
        } catch (error) {
            console.log(error)
            return { success: false, message: await getErrorMessage(error) }
        }
    }

    const deleteReport = async (interviewId) => {
        try {
            await deleteInterviewReport(interviewId)
            setReports(prev => prev.filter(item => item._id !== interviewId))
            if (report?._id === interviewId) {
                setReport(null)
            }
            getInsights() // the deleted report's skill gaps should not count anymore
            return true
        } catch (error) {
            console.log(error)
            return false
        }
    }

    // no page-wide loading here, so ticking a task does not hide the page
    const togglePlanTask = async ({ dayIndex, taskIndex, done }) => {
        const previousReport = report

        // tick the task on screen right away, then save it
        setReport(prev => ({
            ...prev,
            preparationPlan: prev.preparationPlan.map((day, i) => {
                if (i !== dayIndex) return day
                const completedTasks = (day.completedTasks || []).filter(t => t !== taskIndex)
                return { ...day, completedTasks: done ? [ ...completedTasks, taskIndex ] : completedTasks }
            })
        }))

        try {
            const response = await updatePlanProgress({ interviewId: report._id, dayIndex, taskIndex, done })
            setReport(prev => ({ ...prev, preparationPlan: response.preparationPlan, progress: response.progress }))
            setReports(prev => prev.map(item => item._id === report._id ? { ...item, progress: response.progress } : item))
            return true
        } catch (error) {
            console.log(error)
            setReport(previousReport) // saving failed, put the task back as it was
            return false
        }
    }

    const getInsights = async () => {
        try {
            const response = await getInterviewInsights()
            setInsights({ totalReports: response.totalReports, skillGaps: response.skillGaps })
        } catch (error) {
            console.log(error)
        }
    }

    // save "I knew it / I didn't" (and how sure the user was) for a question, type is "technical" or "behavioral"
    const reviewQuestion = async ({ type, index, confidence, knewIt }) => {
        try {
            const response = await updateQuestionReview({ interviewId: report._id, type, index, confidence, knewIt })
            const field = type === "technical" ? "technicalQuestions" : "behavioralQuestions"
            setReport(prev => ({ ...prev, [field]: prev[field].map((q, i) => i === index ? response.question : q) }))
            return true
        } catch (error) {
            console.log(error)
            return false
        }
    }

     // the single report is fetched by the Interview page itself (it needs the result to show "not found"),
     // so here we only fetch the list and the insights for the Home page
     useEffect(() => {
        if (!interviewId) {
            getReports()
            getInsights()
        }
    }, [ interviewId ])


    return { loading, report, reports, insights, generateReport, getReportById, getReports, getResumePdf, getCheatSheetPdf, deleteReport, togglePlanTask, reviewQuestion }

}