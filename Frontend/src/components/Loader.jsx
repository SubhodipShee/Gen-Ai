import React, { useEffect, useState } from 'react'
import { LuSparkles, LuCheck, LuLightbulb } from 'react-icons/lu'


// full screen loading card used by every page
// - steps (optional): move forward every stepSeconds while the server works, the last one stays until the work is done
// - expectedSeconds (optional): shows a progress bar and a seconds counter, the bar stops at 95% until the work is done
// - tips (optional): one tip at a time, changing every 6 seconds
const Loader = ({ title = "Loading", message, steps = [], stepSeconds = 4, expectedSeconds, tips = [] }) => {
    const [ elapsed, setElapsed ] = useState(0)

    const isLong = steps.length > 0 || expectedSeconds || tips.length > 0

    useEffect(() => {
        if (!isLong) return
        const timer = setInterval(() => setElapsed(seconds => seconds + 1), 1000)
        return () => clearInterval(timer)
    }, [ isLong ])

    const activeStep = Math.min(Math.floor(elapsed / stepSeconds), steps.length - 1)
    const progress = expectedSeconds ? Math.min(elapsed / expectedSeconds, 0.95) : 0
    const tip = tips.length ? tips[Math.floor(elapsed / 6) % tips.length] : null

    return (
        <main className='loader' role='status' aria-live='polite'>
            <div className='loader__card'>
                <div className='loader__ring'>
                    <LuSparkles className='loader__icon' />
                </div>

                <h1 className='loader__title'>{title}</h1>
                {message && <p className='loader__message'>{message}</p>}

                {expectedSeconds && (
                    <div className='loader__progress'>
                        <div className='loader__bar'>
                            <div className='loader__fill' style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>
                        <span className='loader__time'>{elapsed}s</span>
                    </div>
                )}

                {steps.length > 0 && (
                    <ul className='loader__steps'>
                        {steps.map((step, i) => {
                            const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'waiting'
                            return (
                                <li key={step} className={`loader__step loader__step--${state}`}>
                                    <span className='loader__step-mark'>{state === 'done' && <LuCheck />}</span>
                                    {step}
                                </li>
                            )
                        })}
                    </ul>
                )}

                {tip && (
                    <p key={tip} className='loader__tip'>
                        <LuLightbulb className='loader__tip-icon' />
                        <span><b>Tip:</b> {tip}</span>
                    </p>
                )}
            </div>
        </main>
    )
}

export default Loader
