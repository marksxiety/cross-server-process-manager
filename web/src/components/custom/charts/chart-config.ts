export const TIME_SERIES_GRID = {
  left: 64,
  right: 14,
  top: 12,
  bottom: 42,
  containLabel: false,
} as const

export const STATUS_LANE_LABEL_WIDTH = 56

export const TIME_SERIES_BRUSH = {
  xAxisIndex: 0,
  brushType: 'lineX',
  brushMode: 'single',
  transformable: false,
  brushStyle: {
    color: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
} as const
