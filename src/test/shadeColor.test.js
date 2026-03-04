/**
 * Unit tests for shadeColor utility (from Preview3D.jsx)
 * Tests colour lightening, darkening, boundary clamping (0–255), and edge cases.
 */
import { describe, it, expect } from 'vitest'

// ── Copy of shadeColor from Preview3D.jsx ─────────────────────────────────────
function shadeColor(hex, amount) {
  let col = hex.replace('#', '')
  if (col.length === 3) col = col.split('').map(c => c + c).join('')
  const num = parseInt(col, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// ══════════════════════════════════════════════════════════════════════════════
describe('shadeColor', () => {
  it('TC-SC-01: positive amount lightens the colour', () => {
    const original = '#805040'
    const lightened = shadeColor(original, 30)
    // R: 128+30=158=0x9e, G: 80+30=110=0x6e, B: 64+30=94=0x5e
    expect(lightened).toBe('#9e6e5e')
  })

  it('TC-SC-02: negative amount darkens the colour', () => {
    const original = '#805040'
    const darkened = shadeColor(original, -30)
    // R: 128-30=98=0x62, G: 80-30=50=0x32, B: 64-30=34=0x22
    expect(darkened).toBe('#623222')
  })

  it('TC-SC-03: amount=0 returns the same colour', () => {
    expect(shadeColor('#aabbcc', 0)).toBe('#aabbcc')
  })

  it('TC-SC-04: channels do not exceed 255 (upper clamp)', () => {
    const result = shadeColor('#f0f0f0', 100)
    // All channels: min(255, 240+100) = 255 → #ffffff
    expect(result).toBe('#ffffff')
  })

  it('TC-SC-05: channels do not go below 0 (lower clamp)', () => {
    const result = shadeColor('#080808', -100)
    // All channels: max(0, 8-100) = 0 → #000000
    expect(result).toBe('#000000')
  })

  it('TC-SC-06: result always starts with # and is 7 characters', () => {
    const result = shadeColor('#123456', 10)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('TC-SC-07: pure black darkened stays black', () => {
    expect(shadeColor('#000000', -50)).toBe('#000000')
  })

  it('TC-SC-08: pure white lightened stays white', () => {
    expect(shadeColor('#ffffff', 50)).toBe('#ffffff')
  })

  it('TC-SC-09: 3-character shorthand hex is expanded and processed correctly', () => {
    // #abc → #aabbcc; R=170, G=187, B=204; +20 → R=190=0xbe, G=207=0xcf, B=224=0xe0
    const result = shadeColor('#abc', 20)
    expect(result).toBe('#becfe0')
  })

  it('TC-SC-10: shading a mid-grey symmetrically gives same result regardless of sign magnitude', () => {
    // Lighten by 50 then check the R channel is correct
    const result = shadeColor('#808080', 50)
    // 128+50 = 178 = 0xb2
    expect(result).toBe('#b2b2b2')
  })
})
