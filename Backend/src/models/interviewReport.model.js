const mongoose = require('mongoose');


/**
 * - job description schema : String
 * - resume text : String
 * - Self description : String
 * 
 *- match score: Number
 * 
 * Technical questions : 
 *                      [{
 *                       question: "",
 *                      intention: "",
 *                         answer: "",
 *                      }]
 * Behavioural questions : [{
 *                       question: "",
 *                      intention: "",
 *                         answer: "",
 *                      }]
 * Skill gaps: [{
 *                      skill: "",
 *                      severity: "",
 *                      types: "",
 *                      enum:["low", "medium", "high"]
 *                     }]
 * Preparation tips: [{
 *                      DAY: "",
 *                      focus: "",
 *                      Tasks:[]
 *                     }]
 */

// Practice fields used by both question schemas (confidence check and revision)
const questionReviewFields = {
    confidence: {          // how sure the user was before reading the answer, 1 to 5
        type: Number,
        min: 1,
        max: 5
    },
    knewIt: {              // after reading the answer: did the user really know it
        type: Boolean
    },
    box: {                 // 0 = didn't know, 1 = knew once, 2 = knew twice or more
        type: Number,
        min: 0,
        max: 2
    },
    nextReviewAt: {        // when the question comes back in "Revise Today"
        type: Date
    }
}

 // Define the technical question schema
const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true,"Technical question is required"]
    },
    intention: {
        type: String,
        required: [true,"Intention is required"]
    },
    answer: {
        type: String,
        required: [true,"Answer is required"]
    },
    ...questionReviewFields
},{
    _id: false
}
);

// Define the behavioural question schema
const behavioralQuestionSchema = new mongoose.Schema({
     question: { 
        type: String, 
        required: [true,"Technical question is required"] 
    },
    intention: { 
        type: String, 
        required: [true,"Intention is required"] 
    },
    answer: {
        type: String,
        required: [true,"Answer is required"]
    },
    ...questionReviewFields
},{
    _id: false
})

// Define the skill gap schema
const skillGapSchema = new mongoose.Schema({
    skill: { 
        type: String, 
        required: [true,"Skill is required"] 
    },
    severity: { 
        type: String, 
        enum:["low", "medium", "high"],
        required: [true,"Severity is required"] 
    }
    
},{
    _id: false
})

// Define the preparation plan schema
const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true,"Day is required"]
    },
    focus: {
        type: String,
        required: [true,"Focus is required"]
    },
    tasks: [{
        type: String,
        required: [true,"Task is required"]
    }],
    // positions of the tasks the user has ticked off, e.g. [0, 2]
    completedTasks: [{
        type: Number
    }]
})

const interviewReportSchema = new mongoose.Schema({
    jobDescription: { 
        type: String, 
        required: [true,"Job description is required"]
     },
    resume: { 
        type: String 
       
     },
    selfDescription: {
        type: String
    },
    matchScore: {
        type: Number,
        min: 0 , 
        max: 100
    },
    technicalQuestions: [technicalQuestionSchema],
    behavioralQuestions: [behavioralQuestionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanSchema],
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    title:{
        type: String,
        required: [true,"Title is required"]

    },
    // saved html of the AI tailored resume, so the resume PDF needs Gemini only once
    resumeHtml: {
        type: String
    },
    // percentage of preparation plan tasks completed
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    }
},{
    timestamps: true
})

// the reports list is searched by user and sorted by newest first
interviewReportSchema.index({ user: 1, createdAt: -1 })


const interviewReportModel = mongoose.model('InterviewReport', interviewReportSchema);

module.exports = interviewReportModel;