import axios from "axios";


const api = axios.create({
    baseURL:"http://localhost:3000",
    withCredentials: true,
})




/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */

export const generateInterviewReport = async ({resumeFile, selfDescription, jobDescription}) => {

const formData = new FormData()
formData.append("resume", resumeFile)
formData.append("selfDescription", selfDescription)
formData.append("jobDescription", jobDescription)

try {
    const response = await api.post("/api/interview", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
    console.log('Interview API Response:', response)
    return response.data
} catch (error) {
    console.error('Interview API Error:', error.response?.data || error.message)
    throw error
}
}

/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}

/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}

/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })

    return response.data
}

