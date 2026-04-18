const {GoogleGenAI} = require ("@google/genai");
const {z} = require("zod")
const {zodToJsonSchema} = require("zod-to-json-schema")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
})


// Define the schema for the interview report using Zod

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job.describe, based on the analysis of the resume, self.describe and job.describe."),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking the question"),
        answer: z.string().describe("How to answer the question in a good way, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview, along with the intention behind asking those questions and how to answer them in a good way."),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking the question"),
        answer: z.string().describe("How to answer the question in a good way, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview, along with the intention behind asking those questions and how to answer them in a good way."),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill that the candidate is lacking based on the resume, self.describe and job.describe"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of the skill gap, whether it is a minor gap that can be easily filled, a moderate gap that requires some effort to fill, or a major gap that may require significant effort to fill."),
    })).describe("The skill gaps in the candidate's profile along with the severity of each skill gap."),
    preparationTips: z.array(z.object({
        day:z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The focus area for the preparation on that day"),
        tasks: z.array(z.string()).describe("The list of tasks to be completed on that day")
    })).describe("A day-wise preparation plan for the candidate, outlining the focus area and tasks to be completed on each day leading up to the interview.")

})


// Function to generate the interview report using the AI model

async function generateInterviewReport( {resume, selfDescription, jobDescription} ) {

    const prompt=`Generate an interview report for a candidate based on the following details:
                    Resume: ${resume}
                    Self.description: ${selfDescription}
                    Job.description: ${jobDescription}
                `


    const response = await ai.models.generateContent({
        model:"gemini-2.5-flash",
        contents:prompt,
        config:{
            responseMimeType:"application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema)

        }
    })
    return JSON.parse(response.text)
}




module.exports = { generateInterviewReport }