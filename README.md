# GenAi - AI-Powered Interview Preparation Platform

**Live Demo:** [interviewtrained.netlify.app](https://interviewtrained.netlify.app)

GenAi is a high-performance, full-stack application that represents the next generation of career development tools. By integrating the state-of-the-art **Google Gemini** model, GenAi revolutionizes how candidates prepare for interviews, bridging the gap between raw skills and professional presentation.

## 🤖 AI Integration & Development

In today's fast-evolving tech landscape, this project stands at the intersection of Generative AI and Human Resources. It utilizes advanced Prompt Engineering and JSON-schema-based AI steering to ensure structured, high-fidelity outputs that provide actionable professional insights.

- **LLM Powered Analysis**: Leverages Google Gemini for deep semantic understanding of resumes vs. job descriptions.
- **Structured Data Extraction**: Implements rigorous Zod-to-JSON schemas to force AI models into producing consistent, machine-readable preparation data.
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
- **History Tracking**: Save and review your previous interview preparation reports.
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
│   │   ├── features/      # Feature-based modular structure
│   │   ├── hooks/         # Custom hooks
│   │   └── services/      # API wrappers
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
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
```
Start the frontend development server:
```bash
npm run dev
```

## 📝 API Endpoints

### Auth
- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Authenticate user

### Interview
- `POST /api/interview/generate` - Upload resume and generate report
- `GET /api/interview/all` - Get all past reports
- `GET /api/interview/:id` - Get specific report details

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

