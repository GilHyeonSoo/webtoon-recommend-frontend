import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { appendAnswer, getCurrentQuestion, getQuestionPath, questions } from '../src/quiz/questions.ts'
import type { AnswerRecord } from '../src/quiz/questions.ts'
import { rankWebtoons } from '../src/quiz/recommendations.ts'
import type { Webtoon } from '../src/quiz/recommendations.ts'

const record = (questionId: string, answerId: string): AnswerRecord => ({ questionId, answerId })
const webtoon = (id: string, extra: Partial<Webtoon> = {}): Webtoon => ({
  id, title: id, provider: 'NAVER', authors: [], thumbnail: [], url: 'https://comic.naver.com',
  isEnd: true, isFree: false, freeWaitHour: null, ageGrade: 0,
  synopsis: null, genres: [], tags: [], ...extra,
})

test('every question offers 2–4 uniquely identified answers', () => {
  for (const question of Object.values(questions)) {
    assert.ok(question.options.length >= 2 && question.options.length <= 4, question.id)
    assert.equal(new Set(question.options.map((option) => option.id)).size, question.options.length)
    assert.ok(question.options.every((option) => option.label.trim().length))
  }
})

for (const focus of ['romance', 'growth', 'mystery', 'daily']) {
  test(`${focus} branch reaches recommendations without unrelated questions`, () => {
    let answers: AnswerRecord[] = []
    const visited: string[] = []
    for (let guard = 0; guard < 20; guard++) {
      const current = getCurrentQuestion(answers)
      if (!current) break
      visited.push(current.id)
      answers = appendAnswer(answers, current.id, current.id === 'focus' ? focus : current.options[0].id)
    }
    assert.equal(getCurrentQuestion(answers), null)
    assert.deepEqual(visited, getQuestionPath(answers))
    assert.equal(visited.at(-1), 'platform')
    assert.ok(visited.length >= 9 && visited.length <= 11)
    if (focus !== 'romance') assert.ok(!visited.includes('romanceOrigin'))
    if (focus !== 'growth') assert.ok(!visited.includes('battle'))
    if (focus !== 'mystery') assert.ok(!visited.includes('horror'))
    if (focus !== 'daily') assert.ok(!visited.includes('dailySetting'))
  })
}

test('changing an earlier answer discards the old branch', () => {
  let answers = [record('mood', 'romance'), record('world', 'real'), record('focus', 'romance'), record('romanceStyle', 'sweet')]
  answers = answers.slice(0, 2)
  answers = appendAnswer(answers, 'focus', 'mystery')
  assert.equal(getCurrentQuestion(answers)?.id, 'tensionType')
  assert.ok(!getQuestionPath(answers).includes('romanceStyle'))
})

test('invalid or duplicate clicks do not skip a question', () => {
  const answers = appendAnswer([], 'mood', 'power')
  assert.deepEqual(appendAnswer(answers, 'mood', 'power'), answers)
  assert.deepEqual(appendAnswer(answers, 'world', 'invalid'), answers)
  assert.equal(getCurrentQuestion(answers)?.id, 'world')
})

test('platform and completion requirements are preserved', () => {
  const catalog = [webtoon('naver'), webtoon('kakao', { provider: 'KAKAO' }), webtoon('ongoing', { provider: 'KAKAO', isEnd: false })]
  const results = rankWebtoons(catalog, [record('platform', 'KAKAO'), record('completion', 'complete')])
  assert.deepEqual(results.map((item) => item.webtoon.id), ['kakao'])
  assert.deepEqual(rankWebtoons(catalog, [record('platform', 'KAKAO_PAGE')]), [])
})

test('taste evidence ranks matching works above unknown metadata', () => {
  const results = rankWebtoons([
    webtoon('unknown'),
    webtoon('action', { tags: ['#통쾌한', '레벨업물'] }),
    webtoon('romance', { genres: ['pure'], tags: ['설레는'] }),
  ], [record('mood', 'power'), record('focus', 'growth')])
  assert.equal(results[0].webtoon.id, 'action')
  const unknown = results.find((item) => item.webtoon.id === 'unknown')!
  assert.equal(unknown.tasteScore, 0)
  assert.equal(unknown.hasMetadata, false)
  assert.deepEqual(unknown.reasons, [])
  assert.ok(results[0].reasons.some((reason) => reason.includes('태그')))
})

test('structured tags carry more weight than synopsis keywords', () => {
  const results = rankWebtoons([
    webtoon('synopsis', { synopsis: '성장하는 주인공의 이야기' }),
    webtoon('tag', { tags: ['성장물'] }),
  ], [record('hero', 'growth')])
  assert.equal(results[0].webtoon.id, 'tag')
  assert.ok(results[0].tasteScore > results[1].tasteScore)
})

test('free preference prioritizes known free access without claiming every episode is free', () => {
  const results = rankWebtoons([
    webtoon('paid'), webtoon('wait', { isFree: true, freeWaitHour: 24 }), webtoon('free', { isFree: true }),
  ], [record('access', 'free')])
  assert.equal(results[0].webtoon.id, 'free')
  assert.ok(results[1].score > results[2].score)
})

test('avoiding horror removes known horror while leaving unknown metadata unclassified', () => {
  const results = rankWebtoons([webtoon('horror', { tags: ['#공포/스릴러'] }), webtoon('unknown')], [record('horror', 'avoid')])
  assert.deepEqual(results.map((item) => item.webtoon.id), ['unknown'])
  assert.deepEqual(results[0].reasons, [])
})

test('the local sample produces valid recommendations for every quiz branch', () => {
  const catalog: Webtoon[] = JSON.parse(readFileSync(new URL('../src/data/webtoons.json', import.meta.url), 'utf8'))
  assert.equal(catalog.length, 30)
  assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length)
  for (const focus of ['romance', 'growth', 'mystery', 'daily']) {
    let answers: AnswerRecord[] = []
    for (let guard = 0; guard < 20; guard++) {
      const current = getCurrentQuestion(answers)
      if (!current) break
      const choice = current.id === 'focus' ? focus : ['completion', 'access', 'platform'].includes(current.id) ? 'any' : current.options[0].id
      answers = appendAnswer(answers, current.id, choice)
    }
    const results = rankWebtoons(catalog, answers)
    assert.equal(results.length, 3)
    assert.ok(results.every((item) => Number.isFinite(item.score) && item.reasons.length <= 3))
    assert.ok(results[0].tasteScore > 0, focus)
  }
})
