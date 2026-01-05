/**
 * Converts full-width Japanese characters to half-width equivalents
 * Supports: numbers (０-９), period (．), comma (，), minus (－)
 */
export const convertFullWidthToHalfWidth = (str: string): string => {
  return str
    .replace(/[０-９]/g, (char) => {
      // Convert full-width numbers (０-９) to half-width (0-9)
      return String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    })
    .replace(/[．]/g, '.') // Convert full-width period (．) to half-width (.)
    .replace(/[，]/g, ',') // Convert full-width comma (，) to half-width (,)
    .replace(/[－]/g, '-') // Convert full-width minus (－, U+FF0D) to half-width (-)
    .replace(/[ー]/g, '-') // Convert katakana long vowel mark (ー, U+30FC) to minus (-) when used as minus
    .replace(/[−]/g, '-') // Convert mathematical minus sign (−, U+2212) to half-width (-)
}

/**
 * Escapes special regex characters in a string
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Checks if a string is a minus sign (half-width, full-width, katakana, or mathematical)
 */
export const isMinusSign = (str: string): boolean => {
  return str === '-' || str === '－' || str === 'ー' || str === '−'
}

/**
 * Converts any minus sign variant to half-width minus
 */
export const normalizeMinusSign = (str: string): string => {
  return isMinusSign(str) ? '-' : str
}

/**
 * Parses a value prop (string or number) to a number, removing separator if present
 */
export const parseValueProp = (
  value: string | number | readonly string[] | null | undefined,
  separator?: string,
): number => {
  if (value === null || value === undefined || value === '') {
    return NaN
  }

  if (typeof value === 'number') {
    return value
  }

  // Handle array case (shouldn't happen for numeric input, but handle gracefully)
  if (Array.isArray(value)) {
    const firstValue = value[0]
    if (!firstValue) {
      return NaN
    }
    const cleanedValue = separator
      ? firstValue.replace(new RegExp(`[${escapeRegex(separator)}]`, 'g'), '')
      : firstValue
    return Number(cleanedValue)
  }

  // At this point, value must be a string
  const cleanedValue = separator
    ? (value as string).replace(new RegExp(`[${escapeRegex(separator)}]`, 'g'), '')
    : (value as string)

  return Number(cleanedValue)
}

/**
 * Normalizes the input string by removing invalid characters
 * and ensuring proper decimal point handling
 */
export const normalizeNumericInput = (
  input: string,
  allowDecimal: boolean,
  allowNegative: boolean,
  maxLength?: number,
): string => {
  let normalized = input

  // Remove all characters except digits, decimal point, and optionally minus sign
  const allowedChars = allowDecimal
    ? allowNegative
      ? /[^0-9.\-]/g
      : /[^0-9.]/g
    : allowNegative
      ? /[^0-9\-]/g
      : /[^0-9]/g

  normalized = normalized.replace(allowedChars, '')

  // Handle negative sign: only allow at the start
  if (allowNegative) {
    const minusCount = (normalized.match(/-/g) || []).length
    if (minusCount > 1) {
      // Keep only the first minus sign
      normalized = normalized.replace(/-/g, (match, offset) => {
        return offset === 0 ? match : ''
      })
    }
    // If minus is not at the start, move it to the start
    if (normalized.includes('-') && !normalized.startsWith('-')) {
      normalized = `-${normalized.replace(/-/g, '')}`
    }
  } else {
    normalized = normalized.replace(/-/g, '')
  }

  // Handle decimal point: only allow one, and only if decimals are allowed
  if (allowDecimal) {
    const decimalCount = (normalized.match(/\./g) || []).length
    if (decimalCount > 1) {
      // Keep only the first decimal point
      const firstDecimalIndex = normalized.indexOf('.')
      normalized =
        normalized.slice(0, firstDecimalIndex + 1) +
        normalized.slice(firstDecimalIndex + 1).replace(/\./g, '')
    }
  } else {
    normalized = normalized.replace(/\./g, '')
  }

  // Apply maxLength if specified
  // maxLength should only apply to digits, not to minus sign or decimal point
  if (maxLength) {
    // Count only digits in the normalized string
    const digitCount = (normalized.match(/\d/g) || []).length
    if (digitCount > maxLength) {
      // Remove excess digits from the end, preserving minus sign and decimal point
      const hasMinus = normalized.startsWith('-')
      let result = hasMinus ? '-' : ''
      let digitsSeen = 0
      let decimalAdded = false
      
      // Start from after minus sign if present
      for (let i = hasMinus ? 1 : 0; i < normalized.length; i++) {
        const char = normalized[i]
        if (/\d/.test(char)) {
          // Only keep digits up to maxLength
          if (digitsSeen < maxLength) {
            result += char
            digitsSeen++
          }
          // Skip excess digits
        } else if (char === '.' && !decimalAdded) {
          // Only keep decimal point if we have at least one digit and haven't added one yet
          if (digitsSeen > 0) {
            result += char
            decimalAdded = true
          }
        }
      }
      
      normalized = result
    }
  }

  return normalized
}

