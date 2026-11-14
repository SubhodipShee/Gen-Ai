# GenAi - AI-Powered Interview Preparation Platform

[![CI](https://github.com/SubhodipShee/Gen-Ai/actions/workflows/ci.yml/badge.svg)](https://github.com/SubhodipShee/Gen-Ai/actions/workflows/ci.yml)

**Live Demo:** [interviewtrained.netlify.app](https://interviewtrained.netlify.app)

GenAi is a high-performance, full-stack application that represents the next generation of career development tools. By integrating the state-of-the-art **Google Gemini** model, GenAi revolutionizes how candidates prepare for interviews, bridging the gap between raw skills and professional presentation.

## 🏗️ System Architecture

For a detailed breakdown of the system design, components, and workflows, please refer to the **[System Architecture Documentation](ARCHITECTURE.md)**.

## 🤖 AI Integration & Development

In today's fast-evolving tech landscape, this project stands at the intersection of Generative AI and Human Resources. It utilizes advanced Prompt Engineering and JSON-schema-based AI steering to ensure structured, high-fidelity outputs that provide actionable professional insights.

- **LLM Powered Analysis**: Leverages Google Gemini for deep semantic understanding of resumes vs. job descriptions.
- **Structured Data Extraction**: Uses JSON schemas to force the AI model into producing consistent, machine-readable preparation data, and Zod to validate it before saving.
- **Automated Intelligence**: Offloads complex reasoning (like identifying skill gaps and creating 7-day study plans) to specialized AI agents, reducing manual effort for the user.

## 🚀 Features

- **User Authentication**: Secure Login and Registration using JWT and Bcrypt.
- **Resume Parsing**: Automatically extracts text from uploaded PDF resumes.
- **AI-Generated Interview Reports**:
  - **Match Score**: Detailed analysis of how well you fit the job role.
  - **Technical Questions**: Targeted questions based on your skills and the job description.
  - **Behavioral Questions**: STAR-method-based questions to prepare for competency rounds.
  - **Skill Gaps**: Identification of areas that need improvement.
  - **7-Day Prep Plan**: A day-by-day roadmap to get you interview-ready.
- **History Tracking**: Save and review your previous interview preparation reports, or delete the ones you don't need.
- **Prep Progress**: Tick off the 7-day plan tasks and see your progress on the report and in the history list.
- **Career Gap Radar**: Shows which skill gaps repeat across all your target jobs, so you know what to learn first.
- **Voice Practice**: Answer a question out loud and get a speaking report (length, words per minute, filler words, long pauses) using the browser's built-in speech recognition (Chrome, Edge, Safari).
- **Interview Cheat Sheet**: One page PDF for the interview morning with your numbers to mention, 3 STAR stories, gaps, blind spots and the plan at a glance.
- **Confidence Check & Revision**: Rate how sure you are before reading an answer, mark if you really knew it, and missed questions come back in "Revise Today" (next day, then 3 and 7 days). Questions you were sure about but got wrong show up as Blind Spots.
- **Resume Optimization**: (Coming Soon) AI-assisted resume generation.

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**
- **React Router 7**
- **Sass (SCSS)**
- **Axios** (API requests)
- **React Icons**

### Backend
- **Node.js & Express**
- **MongoDB & Mongoose** (Database)
- **Google Gemini AI SDK** (@google/genai)
- **Puppeteer** (PDF generation/manipulation)
- **Multer** (File uploads)
- **Zod** (Schema validation)

## 📁 Project Structure

```text
GenAi/
├── Backend/               # Node.js Express server
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # AI and PDF processing
│   │   └── middleware/    # Auth and file handling
│   └── server.js          # Entry point
├── Frontend/              # React application
│   ├── src/
│   │   └── features/      # Feature-based modular structure (auth, interview)
│   │       ├── pages/     # UI pages
│   │       ├── hooks/     # Custom hooks (logic)
│   │       ├── services/  # API wrappers (Axios)
│   │       └── *.context.jsx  # Shared state (Context API)
│   └── index.html
└── package.json           # Root configuration
```

## ⚙️ Setup and Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Google Gemini API Key

### 1. Clone the repository
```bash
git clone https://github.com/SubhodipShee/Gen-Ai.git
cd Gen-Ai
```

### 2. Backend Setup
```bash
cd Backend
npm install
```
Create a `.env` file in the `Backend` directory:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GOOGLE_GENAI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
GEMINI_DAILY_LIMIT=20
```
`CLIENT_URL` is the frontend URL allowed by CORS (defaults to the deployed Netlify URL). Use `NODE_ENV=production` only on the deployed server, it makes the auth cookie `Secure` and `SameSite=None`.

`GEMINI_DAILY_LIMIT` is the most Gemini calls the whole app makes per day (default 20, resets at midnight Pacific time like Google's free quota). Set it a bit below your free "requests per day" shown in Google AI Studio, so the free API key never goes over its limit.

**Limits** (to protect the free Gemini quota and stop abuse):
- Report generation: 5 per hour and 20 per day per user (counted from saved reports, so a restart does not reset them)
- Resume and cheat sheet PDFs: 20 per hour per user
- Login: 10 wrong attempts per 15 minutes per IP; register: 10 per hour per IP
- All API requests: 300 per 15 minutes per IP
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
```
Create a `.env` file in the `Frontend` directory:
```env
VITE_API_URL=http://localhost:3000
```
Start the frontend development server:
```bash
npm run dev
```

## 🧪 Testing

The tests use a fake AI and a temporary in-memory MongoDB, so they need no `.env`, no Gemini key and no Atlas database, and they never use the free Gemini quota.

```bash
cd Backend
npm test          # API, rate limit, Gemini quota guard and PDF tests
npm run test:e2e  # browser tests: builds the frontend and drives it in headless Chrome
```

GitHub Actions runs the frontend lint and build, the API tests and the browser tests on every push to `main` and on every pull request (`.github/workflows/ci.yml`).

## 📝 API Endpoints

### Health
- `GET /api/health` - Returns `{ "status": "ok" }` (no login, no database). The `Keep backend awake` GitHub Action calls it every 10 minutes so Render's free server does not fall asleep.

### Auth
- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/logout` - Logout (blacklists the token)
- `GET /api/auth/get-me` - Get the logged in user (private)

### Interview (all private)
- `POST /api/interview` - Generate a report (multipart: `jobDescription`, plus a `resume` PDF and/or `selfDescription`)
- `GET /api/interview` - Get all past reports of the user
- `GET /api/interview/report/:interviewId` - Get specific report details
- `DELETE /api/interview/report/:interviewId` - Delete a report
- `PATCH /api/interview/report/:interviewId/progress` - Tick or untick a preparation plan task (`dayIndex`, `taskIndex`, `done`)
- `PATCH /api/interview/report/:interviewId/question` - Save a confidence check (`type`, `index`, `knewIt`, optional `confidence` 1-5) and schedule the next revision
- `GET /api/interview/insights` - Skill gaps that repeat across all reports (Career Gap Radar)
- `POST /api/interview/resume/pdf/:interviewReportId` - Generate a tailored resume PDF (AI runs once, the html is saved for later downloads)
- `POST /api/interview/cheatsheet/pdf/:interviewReportId` - Generate a one page interview cheat sheet PDF (no AI call)

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

