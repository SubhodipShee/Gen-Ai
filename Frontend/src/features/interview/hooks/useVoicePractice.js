import { useEffect, useRef, useState } from "react"

// browser built-in speech to text (free, Chrome / Edge / Safari, not Firefox)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const FILLER_WORDS = [ "um", "uh", "uhm", "erm", "hmm", "like", "basically", "actually", "literally", "you know", "i mean", "sort of", "kind of" ]
const LONG_PAUSE_SECONDS = 3

// turns the transcript and timings into the speaking report
const analyseSpeech = ({ text, seconds, longPauses }) => {
    const words = text.trim().split(/\s+/).filter(Boolean)
    const lowerText = text.toLowerCase()

    const fillers = FILLER_WORDS
        .map(word => ({ word, count: (lowerText.match(new RegExp(`\\b${word}\\b`, "g")) || []).length }))
        .filter(filler => filler.count > 0)
    const fillerTotal = fillers.reduce((sum, filler) => sum + filler.count, 0)

    const wordsPerMinute = seconds > 0 ? Math.round(words.length / (seconds / 60)) : 0

    const tips = []
    if (words.length < 15) {
        tips.push("Very short answer, try to explain your approach and give an example.")
    } else {
        if (wordsPerMinute < 110) tips.push("A bit slow, aim for 120 to 160 words per minute.")
        else if (wordsPerMinute > 170) tips.push("A bit fast, slow down so the interviewer can follow, aim for 120 to 160 words per minute.")
        else tips.push("Good speaking pace.")

        if (seconds < 45) tips.push("Short answer, add more detail or an example.")
        else if (seconds > 150) tips.push("Long answer, try to finish within 2 minutes.")
        else tips.push("Good answer length.")
    }
    if (fillerTotal > 3) tips.push(`Try to cut filler words (${fillers.map(filler => `"${filler.word}"`).join(", ")}).`)
    if (longPauses > 2) tips.push("Several long pauses, structure your answer first (for example with STAR).")

    return { seconds: Math.round(seconds), wordCount: words.length, wordsPerMinute, fillers, fillerTotal, longPauses, tips }
}

export const useVoicePractice = () => {

    const recognitionRef = useRef(null)
    const stoppedRef = useRef(true)
    const startedAtRef = useRef(0)
    const stoppedAtRef = useRef(0)
    const lastSpeechAtRef = useRef(0)
    const longPausesRef = useRef(0)
    const finalTextRef = useRef("")
    const interimTextRef = useRef("")
    const timerRef = useRef(null)

    const [ listening, setListening ] = useState(false)
    const [ transcript, setTranscript ] = useState("")
    const [ elapsed, setElapsed ] = useState(0)
    const [ speechReport, setSpeechReport ] = useState(null)
    const [ error, setError ] = useState("")

    const startListening = () => {
        if (!SpeechRecognition || listening) return

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US"

        recognition.onresult = (event) => {
            // a gap of more than 3 seconds between words counts as a long pause
            const now = Date.now()
            if (lastSpeechAtRef.current && now - lastSpeechAtRef.current > LONG_PAUSE_SECONDS * 1000) {
                longPausesRef.current += 1
            }
            lastSpeechAtRef.current = now

            let interim = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript
                if (event.results[i].isFinal) finalTextRef.current += text + " "
                else interim += text
            }
            interimTextRef.current = interim
            setTranscript(finalTextRef.current + interim)
        }

        recognition.onerror = (event) => {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                setError("Microphone access is blocked, allow it in the browser to practise out loud.")
                stoppedRef.current = true
            }
        }

        recognition.onend = () => {
            // the browser stops by itself after some silence, start again until the user presses stop
            if (!stoppedRef.current) {
                try { recognition.start() } catch { stoppedRef.current = true }
                if (!stoppedRef.current) return
            }

            clearInterval(timerRef.current)
            setListening(false)
            const end = stoppedAtRef.current || Date.now()
            const text = finalTextRef.current + interimTextRef.current
            if (text.trim()) {
                setSpeechReport(analyseSpeech({ text, seconds: (end - startedAtRef.current) / 1000, longPauses: longPausesRef.current }))
            }
        }

        // reset everything for a new attempt
        finalTextRef.current = ""
        interimTextRef.current = ""
        longPausesRef.current = 0
        lastSpeechAtRef.current = 0
        stoppedAtRef.current = 0
        startedAtRef.current = Date.now()
        stoppedRef.current = false
        setTranscript("")
        setSpeechReport(null)
        setError("")
        setElapsed(0)

        recognitionRef.current = recognition
        try {
            recognition.start()
        } catch {
            stoppedRef.current = true
            setError("Could not start the microphone, please try again.")
            return
        }
        setListening(true)
        timerRef.current = setInterval(() => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)), 1000)
    }

    const stopListening = () => {
        stoppedRef.current = true
        stoppedAtRef.current = Date.now()
        recognitionRef.current?.stop() // the speaking report is made in onend, after the last words arrive
    }

    // stop the microphone if the question card is closed while recording
    useEffect(() => {
        return () => {
            stoppedRef.current = true
            clearInterval(timerRef.current)
            recognitionRef.current?.abort()
        }
    }, [])

    return { isSupported: !!SpeechRecognition, listening, transcript, elapsed, speechReport, error, startListening, stopListening }
}
