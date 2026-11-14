import { createContext, useState } from "react";

export const InterviewContext = createContext()

export const InterviewProvider = ({children}) => {
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState(null)
    const [reports, setReports] = useState([])
    const [insights, setInsights] = useState(null) // Career Gap Radar: { totalReports, skillGaps }
     return (
        <InterviewContext.Provider value={{ loading, setLoading, report, setReport, reports, setReports, insights, setInsights }}>
            {children}
        </InterviewContext.Provider>
    )
}