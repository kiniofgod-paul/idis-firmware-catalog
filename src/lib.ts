import type { Catalog, DeviceRow, Firmware } from './types'

const tokenize = (value: string): Array<number | string> =>
  value.trim().replace(/^v/i, '').split(/[._+\-]/).flatMap(part =>
    part.match(/\d+|[a-z]+/gi)?.map(x => /^\d+$/.test(x) ? Number(x) : x.toLowerCase()) ?? []
  )

export function compareVersions(a: string, b: string): number {
  const aa = tokenize(a), bb = tokenize(b)
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i] ?? 0, y = bb[i] ?? 0
    if (x === y) continue
    if (typeof x === typeof y) return x < y ? -1 : 1
    return typeof x === 'number' ? 1 : -1
  }
  return 0
}

export function isComparableVersion(value: string): boolean {
  return /^v?\d+(?:[._-]\d+)*(?:[-+._]?[a-z]+\d*)*$/i.test(value.trim())
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++ }
    else if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''
    } else cell += c
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row)
  return rows
}

const aliases = {
  model: ['model', 'modelname', 'product', '모델', '모델명'],
  version: ['currentversion', 'firmware', 'firmwareversion', 'version', '현재버전', '펌웨어']
}

export function devicesFromCsv(text: string): DeviceRow[] {
  const [header = [], ...rows] = parseCsv(text)
  const normalized = header.map(x => x.toLowerCase().replace(/[ _-]/g, ''))
  const find = (keys: string[]) => normalized.findIndex(x => keys.includes(x))
  const mi = find(aliases.model), vi = find(aliases.version)
  if (mi < 0 || vi < 0) throw new Error('CSV에 model과 currentVersion(또는 firmware) 열이 필요합니다.')
  return rows.filter(r => r[mi]).map(r => ({ model: r[mi], currentVersion: r[vi] ?? '' }))
}

export function validateCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== 'object') return false
  const c = value as Catalog
  return c.schemaVersion === '1.0' && Array.isArray(c.products) && c.products.every((p: Firmware) =>
    ['model', 'family', 'category', 'version', 'releasedAt', 'downloadUrl', 'releaseNotes', 'createdAt', 'updatedAt'].every(k => typeof p[k as keyof Firmware] === 'string')
  )
}
