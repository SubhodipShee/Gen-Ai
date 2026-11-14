# GenAi - AI-Powered Interview Preparation Platform

[![CI](https://github.com/SubhodipShee/Gen-Ai/actions/workflows/ci.yml/badge.svg)](https://github.com/SubhodipShee/Gen-Ai/actions/workflows/ci.yml)

**Live Demo:** [interviewtrained.netlify.app](https://interviewtrained.netlify.app)

GenAi is a high-performance, full-stack application that represents the next generation of career development tools. By integrating the state-of-the-art **Google Gemini** model, GenAi revolutionizes how candidates prepare for interviews, bridging the gap between raw skills and professional presentation.

Paste a job description, add your resume (PDF) or a short self-description, and GenAi builds a personal interview plan: a match score, likely technical and behavioral questions with model answers, your skill gaps and a 7-day preparation road map. Then it helps you practise: rate yourself, revise what you missed, answer out loud, and download a tailored resume and a one-page cheat sheet for the interview day.

## 🏗️ System Architecture

For a detailed breakdown of the system design, components, and workflows, please refer to the **[System Architecture Documentation](ARCHITECTURE.md)**.

## 🤖 AI Integration & Development

In today's fast-evolving tech landscape, this project stands at the intersection of Generative AI and Human Resources. It utilizes advanced Prompt Engineering and JSON-schema-based AI steering to ensure structured, high-fidelity outputs that provide actionable professional insights.

- **LLM Powered Analysis**: Leverages Google Gemini (`gemini-3-flash-preview`) for deep semantic understanding of resumes vs. job descriptions.
- **Structured Data Extraction**: Uses JSON schemas to force the AI model into producing consistent, machine-readable preparation data, and Zod to validate it before saving.
- **Fast Responses**: Reports use Gemini's low thinking level, and the tailored resume is generated once per report and then reused, so repeat downloads take about 2 seconds instead of 12.
- **Honest Resumes**: The tailored resume only rephrases and highlights facts from your own resume and self-description; it never adds skills, employers, numbers or contact details you did not give.
- **Free-Tier Friendly**: Every Gemini call goes through a daily cap stored in MongoDB, so the app never goes over the free API quota.

## 🚀 Features

### Interview plan
- **AI-Generated Interview Reports**:
  - **Match Score**: How well you fit the job role.
  - **Technical Questions**: Targeted questions with the interviewer's intention and a model answer.
  - **Behavioral Questions**: STAR-method questions and answers for competency rounds.
  - **Skill Gaps**: Missing or weak skills, marked high / medium / low.
  - **7-Day Prep Plan**: A day-by-day road map with concrete tasks.
- **Resume or Self-Description**: Upload a PDF resume (up to 3MB, text is extracted automatically), write a short self-description, or both.
- **History**: All your plans on the home page, with match score and progress. Delete the ones you don't need.

### Practice
- **Confidence Check**: Before an answer is shown, rate how sure you are (1-5), then mark "I knew it" or "I didn't".
- **Revise Today**: Missed questions come back the next day, known ones after 3 days and then 7 days (spaced repetition).
- **Blind Spots**: Questions you were sure about but didn't really know are listed in the sidebar.
- **Voice Practice**: Answer a question out loud and get a speaking report: length, words per minute, filler words, long pauses and tips. Uses the browser's built-in speech recognition (Chrome, Edge, Safari); nothing is stored.

### Progress & insights
- **Prep Progress**: Tick off the 7-day plan tasks and see your progress on the report and in the history list.
- **Career Gap Radar**: "What to Learn First" shows the skill gaps that repeat across all your target jobs (e.g. "Docker - missing in 4 of 5 jobs").

### Documents
- **Tailored Resume PDF**: A one or two page, ATS-friendly resume rewritten for the job.
- **Interview Cheat Sheet**: A one-page PDF for the interview morning: your numbers to mention, 3 STAR stories, gaps, blind spots, likely topics and the plan at a glance (no AI call).

### Experience
- **Works on phones and tablets**: The report page turns into tabs on small screens, and the home page panels stack.
- **Clear loading screens**: A progress bar, steps and interview tips while the AI writes your plan.
- **Helpful messages**: Limits, wrong passwords and invalid files show the real reason, and forms keep what you typed.
- **Secure accounts**: Login with JWT in an httpOnly cookie, passwords hashed with bcrypt, logout from any page.

## 🛠️ Tech Stack

### Frontend
- **React 19 (Vite 8)**
- **React Router 7**
- **Context API** (state)
- **Sass (SCSS)** with BEM class names
- **Axios** (API requests)
- **React Icons**
- **Web Speech API** (voice practice, built into the browser)

### Backend
- **Node.js & Express 5**
- **MongoDB & Mongoose** (Database)
- **Google Gemini AI SDK** (`@google/genai`)
- **Zod** (validates the AI responses)
- **Puppeteer** (HTML to PDF for the resume and cheat sheet)
- **Multer** + **pdf-parse** (resume upload and text extraction)
- **JSON Web Token**, **bcryptjs**, **cookie-parser** (authentication)
- **helmet** + **express-rate-limit** (security headers and rate limits)

### Testing & DevOps
- **Node's built-in test runner** (API tests)
- **Puppeteer** (browser tests)
- **mongodb-memory-server** (temporary database for tests)
- **GitHub Actions** (CI on every push, and a keep-awake ping)
- **Netlify** (frontend), **Render** (backend), **MongoDB Atlas** (database)

## 🔐 Security & Limits

- Private routes need a valid JWT in an httpOnly cookie; logged-out tokens are blacklisted until they expire (1 day).
- Every report, PDF and progress update is checked against its owner.
- Security headers with helmet, JSON bodies limited to 100kb, uploads limited to PDF files of 3MB.
- PDFs are rendered with JavaScript turned off, and all report text is HTML-escaped.
- Rate limits, which also protect the free Gemini quota:

| What | Limit |
|---|---|
| Report generation | 5 per hour and 20 per day per user (counted from saved reports, so a restart does not reset them) |
| Gemini calls for the whole app | `GEMINI_DAILY_LIMIT` per day (default 20), resets at midnight Pacific time |
| Resume and cheat sheet PDFs | 20 per hour per user |
| Login | 10 wrong attempts per 15 minutes per IP |
| Register | 10 accounts per hour per IP |
| All API requests | 300 per 15 minutes per IP |

## 📁 Project Structure

```text
GenAi/
├── .github/workflows/
│   ├── ci.yml                 # lint, build, API tests and browser tests on every push
│   └── keep-awake.yml         # pings the backend every 10 minutes
├── Backend/                   # Node.js Express server
│   ├── src/
│   │   ├── app.js             # Express app, security, routes, error handler
│   │   ├── config/            # MongoDB connection
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth, file upload and rate limits
│   │   ├── models/            # Mongoose schemas (user, report, blacklist, AI usage)
│   │   ├── routes/            # API endpoints
│   │   └── services/          # Gemini (ai.service) and PDFs (pdf.service)
│   ├── tests/                 # API tests (+ e2e/ browser tests)
│   ├── .puppeteerrc.cjs       # keeps Chrome inside the project (needed on Render)
│   └── server.js              # Entry point
├── Frontend/                  # React application
│   ├── public/_redirects      # Netlify: send every route to the React app
│   ├── src/
│   │   ├── components/        # Shared components (Loader)
│   │   ├── styles/            # Shared styles (buttons, loader)
│   │   └── features/          # Feature-based modular structure (auth, interview)
│   │       ├── pages/         # UI pages
│   │       ├── components/    # Feature components
│   │       ├── hooks/         # Custom hooks (logic)
│   │       ├── services/      # API wrappers (Axios)
│   │       ├── style/         # Feature styles
│   │       └── *.context.jsx  # Shared state (Context API)
│   └── index.html
└── ARCHITECTURE.md
```

## ⚙️ Setup and Installation

### Prerequisites
- Node.js 22 or newer
- MongoDB (Local or Atlas)
- Google Gemini API Key (free from [Google AI Studio](https://aistudio.google.com))

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
`npm install` also downloads the Chrome that Puppeteer uses for the PDFs into `Backend/.cache` (ignored by git).

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

| Variable | What it does |
|---|---|
| `MONGO_URI` | MongoDB connection string. With Atlas, allow your IP in Network Access. |
| `JWT_SECRET` | Long random text used to sign login tokens. |
| `GOOGLE_GENAI_API_KEY` | Your Gemini API key. |
| `CLIENT_URL` | Frontend URL allowed by CORS (defaults to the deployed Netlify URL). |
| `NODE_ENV` | Use `production` only on the deployed server: it makes the login cookie `Secure` and `SameSite=None`. |
| `GEMINI_DAILY_LIMIT` | Most Gemini calls the whole app makes per day. Set it a bit below the free "requests per day" shown in Google AI Studio (for `gemini-3-flash-preview` on the free tier that is about 20, so use 18). |

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

## ☁️ Deployment

- **Frontend (Netlify)**: base directory `Frontend`, build command `npm run build`, publish directory `Frontend/dist`, environment variable `VITE_API_URL` = your backend URL. `public/_redirects` makes page refreshes work.
- **Backend (Render)**: root directory `Backend`, build command `npm install`, start command `node server.js`. Set the environment variables from the table above with `NODE_ENV=production`. Chrome for the PDFs is downloaded during the build and kept in `Backend/.cache`.
- **Database (MongoDB Atlas)**: allow the backend's IP addresses in Network Access (Render's free plan needs `0.0.0.0/0`).
- **Keep awake**: Render's free server sleeps after 15 minutes without visitors. The `Keep backend awake` GitHub Action calls `/api/health` every 10 minutes. GitHub pauses scheduled actions when a repository has no commits for 60 days (it sends an email, and one click turns it back on).

## 📝 API Endpoints

All interview routes are private: they need the login cookie and only return the user's own data.

### Health
- `GET /api/health` - Returns `{ "status": "ok" }` (no login, no database)

### Auth
- `POST /api/auth/register` - Create a new account (valid email, password of 6+ characters)
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/logout` - Logout (blacklists the token)
- `GET /api/auth/get-me` - Get the logged in user (private)

### Interview
- `POST /api/interview` - Generate a report (multipart: `jobDescription`, plus a `resume` PDF and/or `selfDescription`)
- `GET /api/interview` - Get all past reports of the user
- `GET /api/interview/insights` - Skill gaps that repeat across all reports (Career Gap Radar)
- `GET /api/interview/report/:interviewId` - Get specific report details
- `DELETE /api/interview/report/:interviewId` - Delete a report
- `PATCH /api/interview/report/:interviewId/progress` - Tick or untick a preparation plan task (`dayIndex`, `taskIndex`, `done`)
- `PATCH /api/interview/report/:interviewId/question` - Save a confidence check (`type`, `index`, `knewIt`, optional `confidence` 1-5) and schedule the next revision
- `POST /api/interview/resume/pdf/:interviewReportId` - Generate a tailored resume PDF (AI runs once, the html is saved for later downloads)
- `POST /api/interview/cheatsheet/pdf/:interviewReportId` - Generate a one page interview cheat sheet PDF (no AI call)

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request. The CI checks must pass before merging.
