import { providerLabels } from '../quiz/recommendations'
import type { Recommendation } from '../quiz/recommendations'

export function Recommendations({ recommendations }: { recommendations: readonly Recommendation[] }) {
  if (!recommendations.length) {
    return <p className="empty-state">선택한 조건에 맞는 작품이 아직 없어요.<br />이전 답변을 바꾸거나 다른 취향으로 다시 찾아보세요.</p>
  }
  return (
    <div className="recommendation-grid">
      {recommendations.map(({ webtoon, reasons, tasteScore, hasMetadata }, index) => (
        <article className="recommendation-card" key={webtoon.id}>
          <a className="cover-link" href={webtoon.url} target="_blank" rel="noopener noreferrer" aria-label={`${webtoon.title.trim()} ${providerLabels[webtoon.provider]}에서 보기 (새 탭)`}>
            <div className="cover-placeholder" aria-hidden="true">{webtoon.title.trim().slice(0, 1)}</div>
            {webtoon.thumbnail[0] && <img src={webtoon.thumbnail[0]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true }} />}
            <span className="recommendation-number">0{index + 1}</span>
          </a>
          <div className="card-copy">
            <p className="card-provider">{providerLabels[webtoon.provider]} · {webtoon.isEnd ? '완결' : '연재 중'}{webtoon.ageGrade > 0 ? ` · ${webtoon.ageGrade}세 이상` : ''}</p>
            <h2>{webtoon.title.trim()}</h2>
            <p className="card-authors">{webtoon.authors.join(' · ')}</p>
            <p className="card-synopsis">{webtoon.synopsis || '아직 작품 소개가 없어요. 플랫폼에서 자세한 내용을 확인해보세요.'}</p>
            {tasteScore > 0 ? <ul className="recommendation-reasons">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              : <p className="metadata-note">{hasMetadata ? '직접 일치하는 취향 단서가 적어 이용 조건을 기준으로 제안했어요.' : '취향 정보가 아직 없어 플랫폼과 연재 조건을 기준으로 제안했어요.'}</p>}
            <p className="access-note">{webtoon.isFree ? `무료 이용 가능${webtoon.freeWaitHour !== null ? ` · ${webtoon.freeWaitHour}시간 대기 정보` : ' · 대기 정보 없음'}` : '무료 이용 정보 없음'}</p>
            <a className="read-link" href={webtoon.url} target="_blank" rel="noopener noreferrer">작품 보러 가기 <span aria-hidden="true">↗</span></a>
          </div>
        </article>
      ))}
    </div>
  )
}
