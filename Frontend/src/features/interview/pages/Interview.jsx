import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from "../hooks/useInterview"
import { useVoicePractice } from "../hooks/useVoicePractice"
import { Link, useParams } from 'react-router'
import { LuMic, LuFileText } from 'react-icons/lu'



const NAV_ITEMS = [
    { id: 'technical', label: 'Technical Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>) },
    { id: 'behavioral', label: 'Behavioral Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>) },
    { id: 'roadmap', label: 'Road Map', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>) },
    { id: 'revise', label: 'Revise Today', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>) },
]

const CONFIDENCE_LEVELS = [ 1, 2, 3, 4, 5 ]

// 75 -> "1:15"
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

// ── Sub-components ────────────────────────────────────────────────────────────
const VoicePractice = () => {
    const { isSupported, listening, transcript, elapsed, speechReport, error, startListening, stopListening } = useVoicePractice()

    // the browser has no speech recognition (e.g. Firefox), so the feature is hidden
    if (!isSupported) return null

    return (
        <div className='voice-practice'>
            {!listening ? (
                <button className='voice-practice__button' onClick={startListening}>
                    <LuMic />
                    {speechReport ? 'Try again out loud' : 'Practise this answer out loud'}
                </button>
            ) : (
                <button className='voice-practice__button voice-practice__button--recording' onClick={stopListening}>
                    <span className='voice-practice__dot' />
                    Recording {formatTime(elapsed)} · Stop
                </button>
            )}

            {error && <p className='voice-practice__error'>{error}</p>}

            {transcript && (listening || speechReport) && (
                <p className='voice-practice__transcript'>{transcript}</p>
            )}

            {speechReport && (
                <div className='voice-practice__report'>
                    <div className='voice-practice__stats'>
                        <span><b>{formatTime(speechReport.seconds)}</b> length</span>
                        <span><b>{speechReport.wordsPerMinute}</b> words/min</span>
                        <span><b>{speechReport.fillerTotal}</b> filler words</span>
                        <span><b>{speechReport.longPauses}</b> long pauses</span>
                    </div>
                    <ul className='voice-practice__tips'>
                        {speechReport.tips.map(tip => <li key={tip}>{tip}</li>)}
                    </ul>
                    <span className='voice-practice__note'>Speech recognition can leave out "um" and "uh", so the real filler count may be a bit higher.</span>
                </div>
            )}
        </div>
    )
}

const QuestionCard = ({ item, index, label, onReview }) => {
    const [ open, setOpen ] = useState(false)
    const [ revealed, setRevealed ] = useState(false) // the answer shows after the confidence check
    const [ confidence, setConfidence ] = useState(null)
    const [ saving, setSaving ] = useState(false)

    const onPickConfidence = (level) => {
        setConfidence(level)
        setRevealed(true)
    }

    const onMark = async (knewIt) => {
        setSaving(true)
        await onReview({ confidence, knewIt })
        setSaving(false)
    }

    const reviewed = typeof item.knewIt === 'boolean'

    return (
        <div className='q-card'>
            <div className='q-card__header' onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>{label || `Q${index + 1}`}</span>
                <p className='q-card__question'>{item.question}</p>
                {reviewed && (
                    <span className={`q-card__status ${item.knewIt ? 'q-card__status--knew' : 'q-card__status--missed'}`}>
                        {item.knewIt ? 'Knew it' : 'Revise'}
                    </span>
                )}
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </div>
            {open && (
                <div className='q-card__body'>
                    {!revealed ? (
                        <div className='q-card__confidence'>
                            <p>Before you read the answer: how sure are you that you can answer this?</p>
                            <div className='q-card__levels'>
                                {CONFIDENCE_LEVELS.map(level => (
                                    <button key={level} className='q-card__level' onClick={() => onPickConfidence(level)}>{level}</button>
                                ))}
                                <button className='q-card__skip' onClick={() => setRevealed(true)}>Skip</button>
                            </div>
                            <span className='q-card__hint'>1 = no idea, 5 = I know it well</span>
                        </div>
                    ) : (
                        <>
                            <div className='q-card__section'>
                                <span className='q-card__tag q-card__tag--intention'>Intention</span>
                                <p>{item.intention}</p>
                            </div>
                            <div className='q-card__section'>
                                <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                                <p>{item.answer}</p>
                            </div>
                            <div className='q-card__review'>
                                <span>Did you really know it?</span>
                                <button className='q-card__mark q-card__mark--knew' disabled={saving} onClick={() => onMark(true)}>I knew it</button>
                                <button className='q-card__mark q-card__mark--missed' disabled={saving} onClick={() => onMark(false)}>I didn't</button>
                                {item.nextReviewAt && (
                                    <span className='q-card__next'>Next revision: {new Date(item.nextReviewAt).toLocaleDateString()}</span>
                                )}
                            </div>
                        </>
                    )}
                    <VoicePractice />
                </div>
            )}
        </div>
    )
}

const RoadMapDay = ({ day, onToggleTask }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => {
                const done = !!day.completedTasks?.includes(i)
                return (
                    <li key={i} className={done ? 'roadmap-day__task--done' : ''}>
                        <label className='roadmap-day__check'>
                            <input type='checkbox' checked={done} onChange={(e) => onToggleTask(i, e.target.checked)} />
                            <span>{task}</span>
                        </label>
                    </li>
                )
            })}
        </ul>
    </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeNav, setActiveNav ] = useState('technical')
    const [ notFoundId, setNotFoundId ] = useState(null)
    const [ preparingSheet, setPreparingSheet ] = useState(false)
    const { report, getReportById, loading, getResumePdf, getCheatSheetPdf, togglePlanTask, reviewQuestion } = useInterview()
    const { interviewId } = useParams()
    const notFound = notFoundId === interviewId

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId).then(data => {
                if (!data) setNotFoundId(interviewId)
            })
        }
    }, [ interviewId ])

    const onDownloadResume = async () => {
        const success = await getResumePdf(interviewId)
        if (!success) {
            alert("Could not create the resume PDF, please try again")
        }
    }

    const onDownloadCheatSheet = async () => {
        setPreparingSheet(true)
        const success = await getCheatSheetPdf(interviewId)
        setPreparingSheet(false)
        if (!success) {
            alert("Could not create the cheat sheet, please try again")
        }
    }

    const onToggleTask = async (dayIndex, taskIndex, done) => {
        const success = await togglePlanTask({ dayIndex, taskIndex, done })
        if (!success) {
            alert("Could not save your progress, please try again")
        }
    }

    const onReviewQuestion = async (type, index, { confidence, knewIt }) => {
        const success = await reviewQuestion({ type, index, confidence, knewIt })
        if (!success) {
            alert("Could not save your answer check, please try again")
        }
    }

    if (notFound) {
        return (
            <main className='loading-screen'>
                <h1>Interview report not found</h1>
                <p><Link to="/">Go back home</Link></p>
            </main>
        )
    }

    // also wait when the report in state belongs to a different interview
    if (loading || !report || report._id !== interviewId) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    const scoreColor =
        report.matchScore >= 80 ? 'score--high' :
            report.matchScore >= 60 ? 'score--mid' : 'score--low'

    const scoreText =
        report.matchScore >= 80 ? 'Strong match for this role' :
            report.matchScore >= 60 ? 'Good match, a few gaps to close' : 'Needs more preparation for this role'

    // prep progress, counted here so it updates the moment a task is ticked
    const totalTasks = report.preparationPlan.reduce((sum, day) => sum + day.tasks.length, 0)
    const doneTasks = report.preparationPlan.reduce((sum, day) => sum + (day.completedTasks?.length || 0), 0)
    const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

    // all questions with their type and position, used by "Revise Today" and "Blind Spots"
    const allQuestions = [
        ...report.technicalQuestions.map((q, index) => ({ q, index, type: 'technical' })),
        ...report.behavioralQuestions.map((q, index) => ({ q, index, type: 'behavioral' })),
    ]
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const dueQuestions = allQuestions.filter(({ q }) => q.nextReviewAt && new Date(q.nextReviewAt) <= endOfToday)
    // sure about it (4 or 5) but didn't really know it
    const blindSpots = allQuestions.filter(({ q }) => q.confidence >= 4 && q.knewIt === false)

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className='interview-nav__actions'>
                    <button
                        onClick={onDownloadCheatSheet}
                        disabled={preparingSheet}
                        className='button secondary-button' >
                        <LuFileText style={{ marginRight: "0.6rem", verticalAlign: "-2px" }} />
                        {preparingSheet ? 'Preparing...' : 'Cheat Sheet'}
                    </button>
                    <button
                        onClick={onDownloadResume}
                        className='button primary-button' >
                        <svg height={"0.8rem"} style={{ marginRight: "0.8rem" }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6144 17.7956 11.492 15.7854C12.2731 13.9966 13.6789 12.5726 15.4325 11.7942L17.8482 10.7219C18.6162 10.381 18.6162 9.26368 17.8482 8.92277L15.5079 7.88394C13.7092 7.08552 12.2782 5.60881 11.5105 3.75894L10.6215 1.61673C10.2916.821765 9.19319.821767 8.8633 1.61673L7.97427 3.75892C7.20657 5.60881 5.77553 7.08552 3.97685 7.88394L1.63658 8.92277C.868537 9.26368.868536 10.381 1.63658 10.7219L4.0523 11.7942C5.80589 12.5726 7.21171 13.9966 7.99275 15.7854L8.8704 17.7956C9.20776 18.5682 10.277 18.5682 10.6144 17.7956ZM19.4014 22.6899 19.6482 22.1242C20.0882 21.1156 20.8807 20.3125 21.8695 19.8732L22.6299 19.5353C23.0412 19.3526 23.0412 18.7549 22.6299 18.5722L21.9121 18.2532C20.8978 17.8026 20.0911 16.9698 19.6586 15.9269L19.4052 15.3156C19.2285 14.8896 18.6395 14.8896 18.4628 15.3156L18.2094 15.9269C17.777 16.9698 16.9703 17.8026 15.956 18.2532L15.2381 18.5722C14.8269 18.7549 14.8269 19.3526 15.2381 19.5353L15.9985 19.8732C16.9874 20.3125 17.7798 21.1156 18.2198 22.1242L18.4667 22.6899C18.6473 23.104 19.2207 23.104 19.4014 22.6899Z"></path></svg>
                        Download Resume
                    </button>
                    </div>
                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <main className='interview-content'>
                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{report.technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.technicalQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} onReview={(review) => onReviewQuestion('technical', i, review)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{report.behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.behavioralQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} onReview={(review) => onReviewQuestion('behavioral', i, review)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{report.preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {report.preparationPlan.map((day, dayIndex) => (
                                    <RoadMapDay key={day.day} day={day} onToggleTask={(taskIndex, done) => onToggleTask(dayIndex, taskIndex, done)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'revise' && (
                        <section>
                            <div className='content-header'>
                                <h2>Revise Today</h2>
                                <span className='content-header__count'>{dueQuestions.length} questions</span>
                            </div>
                            {dueQuestions.length === 0 ? (
                                <p className='revise-empty'>
                                    Nothing to revise today. Open any question, rate how sure you are, read the answer and mark "I knew it" or "I didn't".
                                    Questions you didn't know come back here the next day, the ones you knew come back after 3 days, then 7 days.
                                </p>
                            ) : (
                                <div className='q-list'>
                                    {dueQuestions.map(({ q, index, type }) => (
                                        <QuestionCard
                                            key={`${type}-${index}`}
                                            item={q}
                                            index={index}
                                            label={`${type === 'technical' ? 'T' : 'B'}${index + 1}`}
                                            onReview={(review) => onReviewQuestion(type, index, review)} />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar'>

                    {/* Match Score */}
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`}>
                            <span className='match-score__value'>{report.matchScore}</span>
                            <span className='match-score__pct'>%</span>
                        </div>
                        <p className='match-score__sub'>{scoreText}</p>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Prep Progress (older reports have no tasks, so it is hidden for them) */}
                    {totalTasks > 0 && (
                        <>
                            <div className='plan-progress'>
                                <p className='plan-progress__label'>Prep Progress</p>
                                <div className='plan-progress__bar'>
                                    <div className='plan-progress__fill' style={{ width: `${progress}%` }} />
                                </div>
                                <p className='plan-progress__text'>{doneTasks} of {totalTasks} tasks done ({progress}%)</p>
                            </div>

                            <div className='sidebar-divider' />
                        </>
                    )}

                    {/* Blind Spots: questions the user was sure about but didn't really know */}
                    <div className='blind-spots'>
                        <p className='blind-spots__label'>Blind Spots</p>
                        {blindSpots.length === 0 ? (
                            <p className='blind-spots__empty'>Questions you rated 4 or 5 but didn't really know will show up here.</p>
                        ) : (
                            <ul className='blind-spots__list'>
                                {blindSpots.map(({ q, index, type }) => (
                                    <li key={`${type}-${index}`} onClick={() => setActiveNav(type)} title={q.question}>
                                        <span>{q.question}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className='sidebar-divider' />

                    {/* Skill Gaps */}
                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {report.skillGaps.map((gap, i) => (
                                <span key={i} className={`skill-tag skill-tag--${gap.severity}`}>
                                    {gap.skill}
                                </span>
                            ))}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    )
}

export default Interview