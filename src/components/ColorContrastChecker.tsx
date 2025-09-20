import React, { useState, useEffect } from 'react'
import { getContrastRatio, isAccessibleContrast } from '@/lib/accessibility'

interface ColorContrastCheckerProps {
  foregroundColor: string
  backgroundColor: string
  fontSize?: 'small' | 'normal' | 'large'
  fontWeight?: 'normal' | 'bold'
}

export const ColorContrastChecker: React.FC<ColorContrastCheckerProps> = ({
  foregroundColor,
  backgroundColor,
  fontSize = 'normal',
  fontWeight = 'normal'
}) => {
  const [contrastRatio, setContrastRatio] = useState<number>(0)
  const [isAccessible, setIsAccessible] = useState<boolean>(false)
  const [wcagLevel, setWcagLevel] = useState<'AA' | 'AAA' | 'FAIL'>('FAIL')

  useEffect(() => {
    const ratio = getContrastRatio(foregroundColor, backgroundColor)
    setContrastRatio(ratio)
    
    const accessible = isAccessibleContrast(foregroundColor, backgroundColor)
    setIsAccessible(accessible)
    
    // Determine WCAG level
    if (ratio >= 7) {
      setWcagLevel('AAA')
    } else if (ratio >= 4.5) {
      setWcagLevel('AA')
    } else {
      setWcagLevel('FAIL')
    }
  }, [foregroundColor, backgroundColor])

  const getWCAGRequirement = () => {
    const isLargeText = fontSize === 'large' || fontWeight === 'bold'
    return isLargeText ? 3 : 4.5
  }

  const requirement = getWCAGRequirement()

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        <div 
          className="w-16 h-16 rounded border"
          style={{ 
            backgroundColor, 
            color: foregroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: fontSize === 'large' ? '18px' : fontSize === 'small' ? '12px' : '14px',
            fontWeight: fontWeight === 'bold' ? 'bold' : 'normal'
          }}
        >
          Aa
        </div>
        
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">
            Контрастность: {contrastRatio.toFixed(2)}:1
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded ${
              wcagLevel === 'AAA' ? 'bg-green-100 text-green-800' :
              wcagLevel === 'AA' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              WCAG {wcagLevel}
            </span>
            {isAccessible ? (
              <span className="text-green-600 text-sm">✓ Доступно</span>
            ) : (
              <span className="text-red-600 text-sm">✗ Недоступно</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-600">
        <p>Требуется минимум {requirement}:1 для WCAG AA</p>
        {wcagLevel === 'FAIL' && (
          <p className="text-red-600 mt-1">
            Этот цвет не соответствует стандартам доступности
          </p>
        )}
      </div>
    </div>
  )
}

// Hook for color contrast validation
export function useColorContrast(foreground: string, background: string) {
  const [contrastRatio, setContrastRatio] = useState<number>(0)
  const [isAccessible, setIsAccessible] = useState<boolean>(false)

  useEffect(() => {
    const ratio = getContrastRatio(foreground, background)
    setContrastRatio(ratio)
    setIsAccessible(isAccessibleContrast(foreground, background))
  }, [foreground, background])

  return {
    contrastRatio,
    isAccessible,
    wcagLevel: contrastRatio >= 7 ? 'AAA' : contrastRatio >= 4.5 ? 'AA' : 'FAIL'
  }
}

// Color palette with accessible colors
export const ACCESSIBLE_COLORS = {
  // Primary colors with good contrast
  primary: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6', // Main blue
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a'
  },
  
  // Gray scale
  gray: {
    '50': '#f9fafb',
    '100': '#f3f4f6',
    '200': '#e5e7eb',
    '300': '#d1d5db',
    '400': '#9ca3af',
    '500': '#6b7280',
    '600': '#4b5563',
    '700': '#374151',
    '800': '#1f2937',
    '900': '#111827'
  },
  
  // Status colors
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb'
} as const

// Predefined accessible color combinations
export const ACCESSIBLE_COMBINATIONS = [
  { foreground: '#ffffff', background: '#1f2937', name: 'Белый на темно-сером' },
  { foreground: '#000000', background: '#ffffff', name: 'Черный на белом' },
  { foreground: '#ffffff', background: '#2563eb', name: 'Белый на синем' },
  { foreground: '#ffffff', background: '#dc2626', name: 'Белый на красном' },
  { foreground: '#000000', background: '#f3f4f6', name: 'Черный на светло-сером' },
  { foreground: '#ffffff', background: '#16a34a', name: 'Белый на зеленом' }
] as const
