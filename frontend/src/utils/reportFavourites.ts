import { REPORTS } from '@/constants/reportsCatalog'

const FAVOURITES_STORAGE_KEY = 'reports.favourites'

export function loadFavourites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    // malformed storage, fall back to defaults
  }
  return new Set(REPORTS.filter((r) => r.favourite).map((r) => r.slug))
}

export function isFavourite(slug: string): boolean {
  return loadFavourites().has(slug)
}

export function setFavourite(slug: string, value: boolean): Set<string> {
  const next = loadFavourites()
  if (value) next.add(slug)
  else next.delete(slug)
  localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify([...next]))
  return next
}
