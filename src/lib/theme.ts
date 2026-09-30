import type { CSSProperties } from 'react'

/**
 * UltimatePlanter product theme.
 *
 * UI colours are exposed as CSS custom properties so the editor components can
 * share their structure with sibling products without owning product colours.
 * WebGL colours live beside them because Three.js cannot resolve CSS variables.
 */
export const planterPalette = {
  charcoal: '#101412',
  charcoalRaised: '#171c19',
  viewport: '#4b554f',
  viewportHighlight: '#747d75',
  forestDeep: '#14231c',
  forest: '#1b3026',
  forestRaised: '#254235',
  forestHover: '#2d4d3e',
  terracotta: '#d77a5f',
  terracottaHover: '#e18d72',
  terracottaSoft: '#5a3329',
  sage: '#91ad8d',
  sageBright: '#b4c9aa',
  cream: '#f4ecd8',
  creamMuted: '#d5cbb6',
  textMuted: '#aaa492',
  neutral: '#776f61',
  neutralSoft: '#554f45',
  warning: '#e8a162',
  danger: '#e07362',
  white: '#ffffff',
  black: '#000000',
  modelTerracotta: '#cf765c',
  modelCream: '#e8dcc4',
  modelInk: '#342f2b',
  modelBrown: '#795b43',
  modelGold: '#d59b46',
  modelPink: '#c9827e',
  modelPinkDark: '#704842',
  viewportGrid: '#526058',
  viewportGridStrong: '#7b8d81',
  viewportLight: '#ffd2bd',
} as const

type ThemeVariables = CSSProperties & Record<`--${string}`, string>

export const planterThemeVariables: ThemeVariables = {
  '--surface-canvas': planterPalette.charcoal,
  '--surface-canvas-raised': planterPalette.charcoalRaised,
  '--surface-viewport': planterPalette.viewport,
  '--surface-viewport-highlight': planterPalette.viewportHighlight,
  '--surface-panel-deep': planterPalette.forestDeep,
  '--surface-panel': planterPalette.forest,
  '--surface-panel-raised': planterPalette.forestRaised,
  '--surface-panel-hover': planterPalette.forestHover,
  '--accent-primary': planterPalette.terracotta,
  '--accent-primary-hover': planterPalette.terracottaHover,
  '--accent-primary-soft': planterPalette.terracottaSoft,
  '--accent-secondary': planterPalette.sage,
  '--accent-secondary-strong': planterPalette.sageBright,
  '--text-primary': planterPalette.cream,
  '--text-secondary': planterPalette.creamMuted,
  '--text-muted': planterPalette.textMuted,
  '--border-strong': planterPalette.neutral,
  '--border-default': planterPalette.neutralSoft,
  '--state-warning': planterPalette.warning,
  '--state-danger': planterPalette.danger,
  '--control-thumb': planterPalette.white,
  '--shadow-color': `${planterPalette.black}66`,
  '--overlay-surface': `${planterPalette.forestDeep}e8`,
  '--overlay-border': `${planterPalette.sage}70`,
  '--focus-ring': `${planterPalette.terracotta}66`,
  '--disabled-surface': `${planterPalette.neutralSoft}80`,
  '--disabled-text': planterPalette.neutral,
}

export const planterPreviewTheme = {
  grid: planterPalette.viewportGrid,
  gridStrong: planterPalette.viewportGridStrong,
  keyLight: planterPalette.viewportLight,
  face: planterPalette.modelInk,
  koalaNose: planterPalette.modelBrown,
  pandaNose: planterPalette.terracotta,
  duckAccent: planterPalette.modelGold,
  pigAccent: planterPalette.modelPink,
  pigDetail: planterPalette.modelPinkDark,
  eyeHighlight: planterPalette.modelCream,
  cheek: planterPalette.modelPink,
  mushroomCap: planterPalette.terracotta,
  hover: planterPalette.terracottaHover,
  selection: planterPalette.sageBright,
  emissiveOff: planterPalette.black,
} as const
