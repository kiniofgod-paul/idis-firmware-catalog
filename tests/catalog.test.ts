import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { compareVersions, devicesFromCsv, isComparableVersion, parseCsv, validateCatalog } from '../src/lib'

describe('version comparison', () => {
  it('compares numeric segments rather than lexically', () => expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0))
  it('accepts v prefix and missing patch parts', () => expect(compareVersions('v2.1', '2.1.0')).toBe(0))
  it('orders prerelease below release', () => expect(compareVersions('2.0-beta', '2.0')).toBeLessThan(0))
  it('rejects vendor text that cannot be compared safely', () => expect(isComparableVersion('build unknown')).toBe(false))
})

describe('CSV import', () => {
  it('parses quoted commas', () => expect(parseCsv('model,note\nDR-1,"rack, east"')[1][1]).toBe('rack, east'))
  it('recognizes dashboard column aliases', () => expect(devicesFromCsv('Model Name,Firmware Version\nDR-1,1.2.3')).toEqual([{model:'DR-1',currentVersion:'1.2.3'}]))
  it('rejects files without required columns', () => expect(() => devicesFromCsv('name,ip\na,1.2.3.4')).toThrow(/model/))
})

it('ships a catalog matching the public contract', () => {
  const data = JSON.parse(readFileSync('public/catalog/v1/firmware.json', 'utf8'))
  expect(validateCatalog(data)).toBe(true)
  expect(new Set(data.products.map((p: {model:string}) => p.model)).size).toBe(data.products.length)
})
