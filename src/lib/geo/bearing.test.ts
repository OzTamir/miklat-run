import { describe, expect, it } from 'vitest'

import { bearingToHebrew, calcBearing } from './bearing'

describe('calcBearing', () => {
  it('returns north bearing for a point directly north', () => {
    const bearing = calcBearing(32, 34, 33, 34)
    expect(Math.min(bearing, 360 - bearing)).toBeCloseTo(0, 3)
  })

  it('returns east bearing for a point directly east', () => {
    const bearing = calcBearing(32, 34, 32, 35)
    expect(bearing).toBeCloseTo(90, 0)
  })
})

describe('bearingToHebrew', () => {
  it('maps all 8 cardinal and intercardinal directions', () => {
    const cases: Array<[number, string]> = [
      [0, 'צפונה'],
      [45, 'צפון-מזרח'],
      [90, 'מזרחה'],
      [135, 'דרום-מזרח'],
      [180, 'דרומה'],
      [225, 'דרום-מערב'],
      [270, 'מערבה'],
      [315, 'צפון-מערב'],
    ]

    for (const [degrees, expected] of cases) {
      expect(bearingToHebrew(degrees)).toBe(expected)
    }
  })

  it('returns צפונה for 0 degrees', () => {
    expect(bearingToHebrew(0)).toBe('צפונה')
  })

  it('returns מזרחה for 90 degrees', () => {
    expect(bearingToHebrew(90)).toBe('מזרחה')
  })
})
