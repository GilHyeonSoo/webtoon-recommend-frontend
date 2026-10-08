import type { Provider } from '../App'

export type Webtoon = {
  id: string
  title: string
  provider: Provider
  updateDays: string[]
  url: string
  thumbnail: string[]
  isEnd: boolean
  isFree: boolean
  isUpdated: boolean
  ageGrade: number
  freeWaitHour: number | null
  authors: string[]
  synopsis: string | null
  genres: string[]
  tags: string[]
}

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export async function fetchWebtoons(provider: Provider): Promise<Webtoon[]> {
  const res = await fetch(
    `${baseUrl}/api/webtoons?provider=${encodeURIComponent(provider)}&limit=20`,
  )
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = (await res.json()) as { webtoons: Webtoon[] }
  return data.webtoons
}
