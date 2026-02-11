import { describe, it, expect } from 'vitest'
import { convertRedcapBranching } from '@/lib/form-engine/redcap-branching-converter'

describe('convertRedcapBranching', () => {
  it('returns empty string for empty input', () => {
    expect(convertRedcapBranching('')).toBe('')
    expect(convertRedcapBranching('  ')).toBe('')
  })

  it('converts [field] to {field}', () => {
    expect(convertRedcapBranching('[age]')).toBe('{age}')
  })

  it('converts = to ==', () => {
    expect(convertRedcapBranching("[sex] = '1'")).toBe('{sex} == "1"')
  })

  it('converts <> to !=', () => {
    expect(convertRedcapBranching("[status] <> '0'")).toBe('{status} != "0"')
  })

  it('preserves >= and <=', () => {
    expect(convertRedcapBranching('[age] >= 18')).toBe('{age} >= 18')
    expect(convertRedcapBranching('[age] <= 65')).toBe('{age} <= 65')
  })

  it('preserves !=', () => {
    expect(convertRedcapBranching("[val] != '0'")).toBe('{val} != "0"')
  })

  it('converts AND/OR to lowercase', () => {
    expect(convertRedcapBranching("[a] = '1' AND [b] = '2'")).toBe('{a} == "1" and {b} == "2"')
    expect(convertRedcapBranching("[a] = '1' OR [b] = '2'")).toBe('{a} == "1" or {b} == "2"')
  })

  it('converts NOT to lowercase', () => {
    expect(convertRedcapBranching("NOT [a] = '1'")).toBe('not {a} == "1"')
  })

  it('converts checkbox checked pattern', () => {
    expect(convertRedcapBranching("[medications(aspirin)]='1'")).toBe('"aspirin" in {medications}')
  })

  it('converts checkbox unchecked pattern', () => {
    expect(convertRedcapBranching("[medications(aspirin)]='0'")).toBe('not ("aspirin" in {medications})')
  })

  it('converts single quotes to double quotes', () => {
    expect(convertRedcapBranching("[type] = 'interventional'")).toBe('{type} == "interventional"')
  })

  it('handles complex expression', () => {
    const input = "[sex] = '1' AND [age] >= 18 AND [age] <= 65"
    const expected = '{sex} == "1" and {age} >= 18 and {age} <= 65'
    expect(convertRedcapBranching(input)).toBe(expected)
  })

  it('handles mixed checkbox and regular conditions', () => {
    const input = "[consent(genomics)]='1' AND [age] >= 18"
    const expected = '"genomics" in {consent} and {age} >= 18'
    expect(convertRedcapBranching(input)).toBe(expected)
  })

  it('handles nested parentheses', () => {
    const input = "([a] = '1' OR [b] = '2') AND [c] = '3'"
    const expected = '({a} == "1" or {b} == "2") and {c} == "3"'
    expect(convertRedcapBranching(input)).toBe(expected)
  })
})
