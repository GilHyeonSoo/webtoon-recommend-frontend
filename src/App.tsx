import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Recommendations } from './components/Recommendations'
import { appendAnswer, getCurrentQuestion } from './quiz/questions'
import type { AnswerRecord } from './quiz/questions'
import { rankWebtoons } from './quiz/recommendations'
import type { Webtoon } from './quiz/recommendations'
import catalog from './data/webtoons.json'

export type { Provider } from './quiz/recommendations'

const GlassScene = lazy(() => import('./components/GlassScene').then((module) => ({ default: module.GlassScene })))

export function App() {
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const stageRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const question = getCurrentQuestion(answers)
  const screenId = question?.id ?? 'results'
  const previousScreen = useRef(screenId)
  const recommendations = useMemo(() => question ? [] : rankWebtoons(catalog as Webtoon[], answers), [question, answers])

  useEffect(() => {
    if (previousScreen.current !== screenId) titleRef.current?.focus({ preventScroll: true })
    previousScreen.current = screenId
    buttons.current.length = question?.options.length ?? 0
  }, [screenId, question])

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!question) return
    const count = question.options.length
    let next: number
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': next = (index + 1) % count; break
      case 'ArrowLeft': case 'ArrowUp': next = (index + count - 1) % count; break
      case 'Home': next = 0; break
      case 'End': next = count - 1; break
      default: return
    }
    event.preventDefault()
    buttons.current[next]?.focus()
  }

  return (
    <main className={`stage${question ? '' : 'results-stage'}`} ref={stageRef} data-question={screenId}>
      {question ? (
        <div className="selection-content" key={question.id}>
          <header className="question-heading">
            <p className="step-label">질문 {String(answers.length + 1).padStart(2, '0')}</p>
            <h1 className="question-title" id="quiz-question" ref={titleRef} tabIndex={-1}>{question.title}</h1>
          </header>
          <div className="orb-row" role="group" aria-labelledby="quiz-question" data-count={question.options.length}>
            {question.options.map((option, index) => (
              <button
                key={`${question.id}-${option.id}`}
                ref={(node) => { buttons.current[index] = node }}
                className="orb-choice"
                style={{ '--order': index } as CSSProperties}
                type="button"
                aria-label={option.label}
                onClick={() => setAnswers((previous) => appendAnswer(previous, question.id, option.id))}
                onKeyDown={(event) => navigate(event, index)}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  event.currentTarget.dataset.pointerX = String((event.clientX - rect.left) / rect.width * 2 - 1)
                  event.currentTarget.dataset.pointerY = String(1 - (event.clientY - rect.top) / rect.height * 2)
                }}
                onPointerLeave={(event) => {
                  delete event.currentTarget.dataset.pointerX
                  delete event.currentTarget.dataset.pointerY
                }}
              >
                <span className="orb-surface" aria-hidden="true">
                  <span className="orb-fallback" />
                  <span className="orb-answer">{option.label}</span>
                </span>
              </button>
            ))}
          </div>
          <nav className="quiz-navigation" aria-label="질문 이동">
            <button className="text-button" type="button" disabled={!answers.length} onClick={() => setAnswers((previous) => previous.slice(0, -1))}>← 이전 질문</button>
            <span className="quiz-hint">원을 눌러 답해주세요</span>
            <button className="text-button" type="button" disabled={!answers.length} onClick={() => setAnswers([])}>처음부터</button>
          </nav>
        </div>
      ) : (
        <section className="results-content" aria-labelledby="result-title">
          <header className="results-heading">
            <p className="step-label">당신의 취향을 따라</p>
            <h1 className="question-title" id="result-title" ref={titleRef} tabIndex={-1}>이 웹툰은 어떠세요?</h1>
            <p className="results-description">현재 등록된 {catalog.length}개 작품을 기준으로 골랐어요.</p>
          </header>
          <Recommendations recommendations={recommendations} />
          <nav className="result-navigation" aria-label="추천 이동">
            <button className="text-button" type="button" onClick={() => setAnswers((previous) => previous.slice(0, -1))}>← 이전 답변 바꾸기</button>
            <button className="restart-button" type="button" onClick={() => setAnswers([])}>다른 취향으로 다시 찾기</button>
          </nav>
        </section>
      )}
      <Suspense fallback={null}><GlassScene stageRef={stageRef} /></Suspense>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {question ? `${answers.length + 1}번째 질문. ${question.title}. 답변 ${question.options.length}개.` : `${recommendations.length}개의 추천 작품을 찾았어요.`}
      </p>
    </main>
  )
}
