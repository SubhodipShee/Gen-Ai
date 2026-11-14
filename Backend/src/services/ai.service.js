const { GoogleGenAI, ThinkingLevel } = require("@google/genai");
const { z } = require("zod");
const puppeteer = require("puppeteer");


const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// Define the raw JSON schema directly — skip zodToJsonSchema entirely
const interviewReportJsonSchema = {
  type: "object",
  properties: {
    matchScore: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description:
        "Score from 0-100 indicating how well the candidate matches the job requirements",
    },
    technicalQuestions: {
      type: "array",
      minItems: 8,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The technical interview question",
          },
          intention: {
            type: "string",
            description: "What the interviewer is testing with this question",
          },
          answer: {
            type: "string",
            description:
              "Detailed answer with approach, key points, and pitfalls",
          },
        },
        required: ["question", "intention", "answer"],
      },
    },
    behavioralQuestions: {
      type: "array",
      minItems: 5,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The behavioral interview question",
          },
          intention: {
            type: "string",
            description: "What competency the interviewer is evaluating",
          },
          answer: {
            type: "string",
            description: "STAR method answer with key points to highlight",
          },
        },
        required: ["question", "intention", "answer"],
      },
    },
    skillGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string", description: "The missing or weak skill" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["skill", "severity"],
      },
    },
    preparationPlan: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          day: { type: "integer", description: "Day number from 1 to 7" },
          focus: {
            type: "string",
            description: "Main topic to study that day",
          },
          tasks: {
            type: "array",
            items: { type: "string" },
            description: "Specific actionable tasks for the day",
          },
        },
        required: ["day", "focus", "tasks"],
      },
    },
    title: {
      type: "string",
      description: "A Role fit based on report",
    },
  },
  required: [
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan",
    "title",
  ],
};

// Keep Zod only for runtime validation after receiving the response
const interviewReportZodSchema = z.object({
  matchScore: z.number().min(0).max(100),
  technicalQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    }),
  ),
  behavioralQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    }),
  ),
  skillGaps: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  preparationPlan: z.array(
    z.object({
      day: z.number(),
      focus: z.string(),
      tasks: z.array(z.string()),
    }),
  ),
  title: z.string(),
});

// Raw JSON schema for the tailored resume — same approach as the report schema above
const resumePdfJsonSchema = {
  type: "object",
  properties: {
    html: {
      type: "string",
      description:
        "HTML content of the resume which can be converted to pdf using any library like puppeteer",
    },
  },
  required: ["html"],
};

const resumePdfZodSchema = z.object({
  html: z.string().min(1),
});

async function generateInterviewReport({
  resume,
  jobDescription,
  selfDescription,
}) {
  const prompt = `
You are an expert technical recruiter and interview coach with 15+ years of experience.

Analyze the candidate's profile against the job description and generate a comprehensive interview preparation report.

## Resume
${resume || "Not provided"}

## Job Description
${jobDescription}

## Candidate Self-Description
${selfDescription || "Not provided"}

## Instructions

**matchScore**: Score 0–100 based on skills overlap, experience relevance, and seniority fit. Be realistic.

*technicalQuestions* (8–10 questions):
- Ask questions based ONLY on technologies in the resume and job description.
- Cover: core language/runtime concepts, database design, caching, system design, security, and performance.
- For each: write the actual question, explain why an interviewer would ask it, and give a thorough answer.

*behavioralQuestions* (5–6 questions):
- Tailor to the seniority level in the job description.
- Cover: collaboration, conflict resolution, ownership, learning agility, technical decision-making.
- For each: write the actual question, explain what the interviewer is evaluating, and give a STAR-method answer.

**skillGaps**:
- List every required or preferred skill from the job description that is weak or absent in the resume.
- Assign severity: high = required and missing, medium = preferred but partial, low = nice-to-have.

*preparationPlan* (exactly 7 days, day 1 through 7):
- For each day: one focus topic and 3–4 short, specific tasks.
- Day 1–2: Focus on high-severity skill gaps.
- Day 3–5: Core technical topics and system design.
- Day 6: Behavioral prep and resume storytelling.
- Day 7: Mock interview and full revision.

**title**: Create a concise title summarizing the candidate's fit and key focus areas for preparation.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      // low thinking makes the report much faster, temperature is ignored by Gemini 3 so it is not set
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseJsonSchema: interviewReportJsonSchema, // ✅ raw schema, no zod wrapper
    },
  });

  const result = interviewReportZodSchema.safeParse(JSON.parse(response.text));

  if (!result.success) {
    throw new Error("AI returned an invalid interview report, please try again");
  }

  return result.data;
}
// using puppeteer

const generatePdfFromHtml = async (htmlContent) => {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({format:"A4",margin:{top:"20mm",bottom:"20mm",left:"15mm",right:"15mm"}});
    return pdfBuffer;
  } finally {
    // always close chrome, even on error, so it does not stay in memory on the server
    await browser.close();
  }
}

// genereating the html of the tailored resume with AI, the controller saves it so this runs once per report

const generateResumeHtml = async ({
  jobDescription,
  resume,
  selfDescription,
}) => {
  const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume || "Not provided"}
                        Self Description: ${selfDescription || "Not provided"}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        Use ONLY facts from the given resume and self description. You can reorder, rephrase and highlight them for the job, but never add skills, tools, employers, projects, numbers or contact details that the candidate did not mention, even if the job description asks for them.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: resumePdfJsonSchema,
    },
  });
  const result = resumePdfZodSchema.safeParse(JSON.parse(response.text));

  if (!result.success) {
    throw new Error("AI returned an invalid resume, please try again");
  }

  return result.data.html;
};

module.exports = {generateInterviewReport,generateResumeHtml,generatePdfFromHtml};