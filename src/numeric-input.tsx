'use client'

import {
  type ComponentProps,
  type CompositionEvent,
  type FocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type NumericInputValue = {
  value: number
  formattedValue: string
}

type NumericInputProps = ComponentProps<'input'> & {
  onValueChange: (valueObject: NumericInputValue) => void
  separator?: string
  allowDecimal?: boolean
  allowNegative?: boolean
  minValue?: number
  maxValue?: number
  maxDecimalPlaces?: number
}

/**
 * Converts full-width Japanese characters to half-width equivalents
 * Supports: numbers (０-９), period (．), comma (，), minus (－)
 */
const convertFullWidthToHalfWidth = (str: string): string => {
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
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Normalizes the input string by removing invalid characters
 * and ensuring proper decimal point handling
 */
const normalizeNumericInput = (
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
  if (maxLength && normalized.length > maxLength) {
    normalized = normalized.slice(0, maxLength)
  }

  return normalized
}

function NumericInput({
  value,
  className,
  separator,
  onValueChange,
  onCompositionStart,
  onCompositionEnd,
  onBlur,
  maxLength,
  allowDecimal = false,
  allowNegative = false,
  minValue,
  maxValue,
  maxDecimalPlaces,
  ...props
}: NumericInputProps) {
  // Validate min/max values
  if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
    console.warn(
      'NumericInput: minValue should be less than or equal to maxValue',
    )
  }
  const isComposing = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Store the raw input value during IME composition
  const [composingValue, setComposingValue] = useState<string>('')
  // Track if we've already processed the value from composition end
  const hasProcessedComposition = useRef(false)
  // Store the raw input string to preserve leading zeros
  const [rawInputValue, setRawInputValue] = useState<string>('')

  const formatValue = useCallback(
    (numValue: number): string => {
      if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
        return ''
      }

      const valueStr = numValue.toString()

      // If no separator, return as is
      if (!separator) {
        return valueStr
      }

      // Split into integer and decimal parts
      const [integerPart, decimalPart] = valueStr.split('.')

      // Format integer part with separator (thousands separator)
      const formattedInteger = integerPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        separator,
      )

      // Combine with decimal part if exists
      return decimalPart !== undefined
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger
    },
    [separator],
  )

  const handleValueChange = useCallback(
    (inputValue: string, skipCompositionCheck = false) => {
      // During IME composition, update the composing value for display
      // Don't convert full-width to half-width yet - wait for composition end
      if (!skipCompositionCheck && isComposing.current) {
        setComposingValue(inputValue)
        // Store raw input value (could be full-width) for later processing
        setRawInputValue(inputValue)
        // Still notify parent but don't process the value
        onValueChange({
          value: 0,
          formattedValue: inputValue,
        })
        return
      }

      // Convert full-width Japanese characters to half-width
      let rawValue = convertFullWidthToHalfWidth(inputValue)

      // Remove scientific notation (e.g., "1e10", "1E10")
      // This prevents unexpected number conversions
      rawValue = rawValue.replace(/[eE]/g, '')

      // Normalize the input (remove invalid chars, handle decimals, negatives)
      rawValue = normalizeNumericInput(
        rawValue,
        allowDecimal,
        allowNegative,
        maxLength,
      )

      // Limit decimal places if specified
      if (maxDecimalPlaces !== undefined && allowDecimal) {
        const decimalIndex = rawValue.indexOf('.')
        if (decimalIndex !== -1) {
          const integerPart = rawValue.slice(0, decimalIndex)
          const decimalPart = rawValue.slice(decimalIndex + 1)
          if (decimalPart.length > maxDecimalPlaces) {
            rawValue = `${integerPart}.${decimalPart.slice(0, maxDecimalPlaces)}`
          }
        }
      }

      // Handle empty input first (before processing leading zeros)
      if (rawValue === '') {
        setRawInputValue('')
        onValueChange({
          value: 0,
          formattedValue: '',
        })
        return
      }

      // Handle only minus sign (half-width or full-width converted): preserve it if allowNegative is true
      if (rawValue === '-') {
        if (allowNegative) {
          setRawInputValue('-')
          onValueChange({
            value: 0,
            formattedValue: '-',
          })
          return
        } else {
          // If negative is not allowed, treat as empty
          setRawInputValue('')
          onValueChange({
            value: 0,
            formattedValue: '',
          })
          return
        }
      }

      // Remove leading zeros except for single "0" or "0." patterns
      // Only allow "0", "-0", "0.", "-0." to keep leading zero
      // For cases like "01", "0123", "09999", "00.1" → remove leading zeros
      const shouldKeepSingleZero =
        rawValue === '0' ||
        rawValue === '-0' ||
        rawValue === '0.' ||
        rawValue === '-0.'

      if (!shouldKeepSingleZero) {
        // Remove leading zeros (but keep the minus sign if present)
        if (rawValue.startsWith('-')) {
          const withoutMinus = rawValue.slice(1)
          // Split by decimal point to handle cases like "00.1"
          if (withoutMinus.includes('.')) {
            const [integerPart, decimalPart] = withoutMinus.split('.')
            const cleanedInteger = integerPart.replace(/^0+/, '')
            // If cleanedInteger is empty and there's a decimal part, keep "0"
            if (cleanedInteger === '' && decimalPart) {
              rawValue = `-0.${decimalPart}`
            } else if (cleanedInteger === '') {
              rawValue = '-0'
            } else {
              rawValue = `-${cleanedInteger}.${decimalPart}`
            }
          } else {
            const withoutLeadingZeros = withoutMinus.replace(/^0+/, '')
            rawValue =
              withoutLeadingZeros === '' ? '-0' : `-${withoutLeadingZeros}`
          }
        } else {
          // Split by decimal point to handle cases like "00.1"
          if (rawValue.includes('.')) {
            const [integerPart, decimalPart] = rawValue.split('.')
            const cleanedInteger = integerPart.replace(/^0+/, '')
            // If cleanedInteger is empty and there's a decimal part, keep "0"
            if (cleanedInteger === '' && decimalPart) {
              rawValue = `0.${decimalPart}`
            } else if (cleanedInteger === '') {
              rawValue = '0'
            } else {
              rawValue = `${cleanedInteger}.${decimalPart}`
            }
          } else {
            const cleaned = rawValue.replace(/^0+/, '')
            rawValue = cleaned === '' ? '0' : cleaned
          }
        }
      }

      // Store the raw input value to preserve single "0" only
      setRawInputValue(rawValue)

      // Convert to number
      const valueAsNumber = Number(rawValue)

      // Handle invalid numbers
      if (Number.isNaN(valueAsNumber) || !Number.isFinite(valueAsNumber)) {
        setRawInputValue('')
        onValueChange({
          value: 0,
          formattedValue: '',
        })
        return
      }

      // Handle value exceeding MAX_SAFE_INTEGER
      if (Math.abs(valueAsNumber) > Number.MAX_SAFE_INTEGER) {
        const clampedValue =
          valueAsNumber > 0 ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER
        const clampedString = clampedValue.toString()
        setRawInputValue(clampedString)
        onValueChange({
          value: clampedValue,
          formattedValue: formatValue(clampedValue),
        })
        return
      }

      // Only preserve single "0" or "0." patterns (not multiple leading zeros like "01", "0123")
      const isSingleZero =
        rawValue === '0' ||
        rawValue === '-0' ||
        rawValue.startsWith('0.') ||
        rawValue.startsWith('-0.')

      // Check if the value ends with a decimal point (e.g., "2.", "-2.", "123.")
      // This allows users to continue typing decimal digits
      const endsWithDecimalPoint =
        allowDecimal && rawValue.endsWith('.') && !rawValue.endsWith('..')

      // Apply min/max validation only for complete numbers (not intermediate typing states)
      // Allow intermediate values while typing (e.g., allow "1000" if max is 100, user might be typing "100")
      let finalValue = valueAsNumber
      let finalRawValue = rawValue
      let shouldClamp = false

      // Only clamp if the value is complete (not ending with decimal point and not a single zero pattern)
      if (!isSingleZero && !endsWithDecimalPoint) {
        if (minValue !== undefined && finalValue < minValue) {
          finalValue = minValue
          finalRawValue = minValue.toString()
          shouldClamp = true
        }
        if (maxValue !== undefined && finalValue > maxValue) {
          finalValue = maxValue
          finalRawValue = maxValue.toString()
          shouldClamp = true
        }
      }

      // If clamped, update rawInputValue
      if (shouldClamp) {
        setRawInputValue(finalRawValue)
      }

      // If it's a single zero pattern or ends with decimal point, use the raw value for display
      if (isSingleZero || endsWithDecimalPoint) {
        // Use the raw value as-is to preserve single "0" or trailing decimal point
        onValueChange({
          value: finalValue,
          formattedValue: shouldClamp ? formatValue(finalValue) : rawValue,
        })
        return
      }

      // Valid number without leading zeros - format and return
      onValueChange({
        value: finalValue,
        formattedValue: formatValue(finalValue),
      })
    },
    [
      allowDecimal,
      allowNegative,
      maxLength,
      onValueChange,
      formatValue,
      separator,
      minValue,
      maxValue,
      maxDecimalPlaces,
    ],
  )

  const handleCompositionStart = useCallback(
    (e: CompositionEvent<HTMLInputElement>) => {
      isComposing.current = true
      hasProcessedComposition.current = false
      // Store the current input value when composition starts
      setComposingValue(e.currentTarget.value)

      // Handle custom onCompositionStart
      if (onCompositionStart) {
        onCompositionStart(e)
      }
    },
    [onCompositionStart],
  )

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false
      const finalValue = e.currentTarget.value
      // Clear the composing value
      setComposingValue('')
      // Mark that we've processed composition to prevent duplicate processing in onChange
      hasProcessedComposition.current = true

      // Handle custom onCompositionEnd
      if (onCompositionEnd) {
        onCompositionEnd(e)
      }

      // Process the value after composition ends
      // Convert full-width to half-width and preserve minus sign if needed
      // Use requestAnimationFrame to ensure it happens after any pending onChange events
      requestAnimationFrame(() => {
        // Convert full-width to half-width before processing
        const convertedValue = convertFullWidthToHalfWidth(finalValue)
        
        // If the converted value is just a minus sign, preserve it
        if (allowNegative && convertedValue === '-') {
          setRawInputValue('-')
          onValueChange({
            value: 0,
            formattedValue: '-',
          })
        } else {
          // Process normally
          handleValueChange(convertedValue, true)
        }
        
        // Reset flag after processing
        hasProcessedComposition.current = false
      })
    },
    [onCompositionEnd, handleValueChange, allowNegative],
  )

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // Check if we need to preserve minus sign before processing
      // Check both half-width and full-width minus in rawInputValue and e.target.value
      // Also check katakana long vowel mark (ー) and mathematical minus sign (−) which can be used as minus
      const currentValue = e.target.value
      const isCurrentValueMinus = currentValue === '-' || currentValue === '－' || currentValue === 'ー' || currentValue === '−'
      const isRawInputMinus = rawInputValue === '-' || rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−'
      const shouldPreserveMinus = allowNegative && (isRawInputMinus || isCurrentValueMinus)
      
      // If still composing when blur happens, force end composition
      if (isComposing.current) {
        isComposing.current = false
        const finalValue = e.target.value
        setComposingValue('')
        hasProcessedComposition.current = true
        // Convert full-width to half-width before processing
        const convertedValue = convertFullWidthToHalfWidth(finalValue)
        // If the converted value is just a minus sign, preserve it
        if (allowNegative && convertedValue === '-') {
          setRawInputValue('-')
          onValueChange({
            value: 0,
            formattedValue: '-',
          })
        } else {
          // Process the value immediately
          handleValueChange(convertedValue, true)
        }
      } else if (composingValue !== '') {
        // If there's a composing value but not composing, process it
        // Convert full-width to half-width before processing
        const convertedValue = convertFullWidthToHalfWidth(composingValue)
        // If the converted value is just a minus sign, preserve it
        if (allowNegative && convertedValue === '-') {
          setRawInputValue('-')
          onValueChange({
            value: 0,
            formattedValue: '-',
          })
        } else {
          handleValueChange(convertedValue, true)
        }
        setComposingValue('')
      } else if (!hasProcessedComposition.current && e.target.value) {
        // If we haven't processed composition and there's a value, process it
        // Convert full-width to half-width before processing
        const convertedValue = convertFullWidthToHalfWidth(e.target.value)
        // Process the value - handleValueChange will preserve minus sign if present
        handleValueChange(convertedValue, true)
      }

      // Apply min/max validation on blur for any intermediate values
      // This ensures values are clamped even if user was typing an out-of-range value
      // But preserve intermediate states like "-" (minus sign only, half-width or full-width)
      if (rawInputValue !== '') {
        // Preserve minus sign only if allowNegative is true - skip clamp validation
      // Check half-width, full-width minus, katakana long vowel mark (ー), and mathematical minus sign (−)
      const isMinusOnly = allowNegative && (rawInputValue === '-' || rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−')
        
        if (!isMinusOnly) {
          // Convert to half-width for number conversion
          const convertedValue = convertFullWidthToHalfWidth(rawInputValue)
          const numValue = Number(convertedValue)
          if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
            let clampedValue = numValue
            let shouldUpdate = false

            if (minValue !== undefined && clampedValue < minValue) {
              clampedValue = minValue
              shouldUpdate = true
            }
            if (maxValue !== undefined && clampedValue > maxValue) {
              clampedValue = maxValue
              shouldUpdate = true
            }

            if (shouldUpdate) {
              const clampedString = clampedValue.toString()
              setRawInputValue(clampedString)
              onValueChange({
                value: clampedValue,
                formattedValue: formatValue(clampedValue),
              })
            }
          }
        }
      }
      
      // If we need to preserve minus sign (only when value is just minus, no numbers), ensure it's still set as half-width
      // Check both current rawInputValue and the value from input element
      // Only preserve if the value is just a minus sign, not if it has numbers (those are handled by handleValueChange)
      if (shouldPreserveMinus) {
        // Check if rawInputValue is just a minus sign (not a number with minus)
        const isJustMinus = rawInputValue === '-' || rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−'
        if (isJustMinus) {
          // Convert any full-width minus to half-width
          const finalMinusValue = '-'
          if (rawInputValue !== finalMinusValue) {
            setRawInputValue(finalMinusValue)
            onValueChange({
              value: 0,
              formattedValue: finalMinusValue,
            })
          }
        }
        // If rawInputValue has numbers (e.g., "-123"), handleValueChange already processed it correctly
      }

      // Reset the flag
      hasProcessedComposition.current = false

      // Call custom onBlur if provided
      if (onBlur) {
        onBlur(e)
      }
    },
    [composingValue, onBlur, handleValueChange, rawInputValue, minValue, maxValue, formatValue, allowNegative],
  )

  // Reset rawInputValue when value prop changes externally (e.g., form reset)
  useEffect(() => {
    if (value === null || value === undefined || value === '') {
      // Preserve "-", "－", "ー", or "−" if allowNegative is true and user is typing negative number
      if (allowNegative && (rawInputValue === '-' || rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−')) {
        return
      }
      setRawInputValue('')
      return
    }

    // Convert value to number if it's a string
    // Escape separator for regex if it exists
    const numValue =
      typeof value === 'string'
        ? Number(
            value.replace(
              new RegExp(`[${separator ? escapeRegex(separator) : ''}]`, 'g'),
              '',
            ),
          )
        : Number(value)

    // If the value is 0, preserve rawInputValue if it's "0", "-0", "0.", "-0.", "-", "－", "ー", or "−"
    // Also preserve negative numbers when allowNegative is true (user might be typing)
    // Otherwise, if value prop is 0 (controlled from outside), set rawInputValue to "0" to display it
    if (numValue === 0) {
      const isSingleZero =
        rawInputValue === '0' ||
        rawInputValue === '-0' ||
        rawInputValue === '-' ||
        rawInputValue === '－' ||
        rawInputValue === 'ー' ||
        rawInputValue === '−' ||
        rawInputValue.startsWith('0.') ||
        rawInputValue.startsWith('-0.')
      
      // Check if rawInputValue is a negative number (preserve it when allowNegative is true)
      if (allowNegative && rawInputValue !== '') {
        const convertedRawValue = convertFullWidthToHalfWidth(rawInputValue)
        const rawAsNumber = Number(convertedRawValue)
        // If it's a valid negative number, preserve it
        if (!Number.isNaN(rawAsNumber) && Number.isFinite(rawAsNumber) && rawAsNumber < 0) {
          return
        }
      }
      
      if (!isSingleZero) {
        // If value prop is 0 from outside, we should display "0"
        // Set rawInputValue to "0" so it can be displayed
        setRawInputValue('0')
      }
      return
    }

    // For non-zero values, check if the numeric value matches what we'd get from rawInputValue
    // But preserve intermediate states like "-", "－", or "ー" (minus sign only)
    // Also preserve negative numbers that start with minus sign when allowNegative is true
    if (rawInputValue !== '') {
      // Preserve minus sign only if allowNegative is true (half-width, full-width, katakana, and mathematical minus)
      if (allowNegative && (rawInputValue === '-' || rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−')) {
        // Don't clear rawInputValue if it's just a minus sign
        return
      }
      
      // Convert to half-width for number comparison
      const convertedRawValue = convertFullWidthToHalfWidth(rawInputValue)
      const rawAsNumber = Number(convertedRawValue)
      
      // If rawInputValue starts with minus and allowNegative is true, preserve it
      // This handles cases where user is typing negative numbers and value prop might not match yet
      if (allowNegative && convertedRawValue.startsWith('-')) {
        // Always preserve negative numbers when allowNegative is true
        // Only clear if value prop is a positive number that clearly doesn't match
        // (e.g., rawInputValue is "-123" but numValue is 123 - signs differ)
        if (rawAsNumber === numValue) {
          // They match, keep rawInputValue
          return
        } else if (numValue > 0 && Math.abs(rawAsNumber) === numValue) {
          // Value prop is positive but rawInputValue is negative with same absolute value
          // This means parent explicitly set a positive value, so clear rawInputValue
          setRawInputValue('')
        } else {
          // In all other cases (numValue is 0, negative, or doesn't match), preserve rawInputValue
          // This ensures user's typing is not lost
          return
        }
      } else {
        // For non-negative values, check if they match
        if (rawAsNumber !== numValue) {
          // Value changed externally, clear rawInputValue
          setRawInputValue('')
        }
      }
    }
  }, [value, separator, rawInputValue, allowNegative])

  // Format the display value
  const displayValue = useMemo(() => {
    // If currently composing, use the composing value (this allows IME input to display)
    if (composingValue !== '') {
      return composingValue
    }

    // If rawInputValue is empty, check if we should display the value prop
    // This handles both: value prop from outside, and user deleting content
    if (rawInputValue === '') {
      if (value === null || value === undefined || value === '') {
        return ''
      }
      // Convert value to number if it's a string
      // Escape separator for regex if it exists
      const numValue =
        typeof value === 'string'
          ? Number(
              value.replace(
                new RegExp(`[${separator ? escapeRegex(separator) : ''}]`, 'g'),
                '',
              ),
            )
          : Number(value)
      // If value is 0 and rawInputValue is empty, show "0" (value prop from outside)
      // This allows displaying 0 when it's passed as a prop
      // Note: If user deletes content, onValueChange is called with formattedValue: '',
      // and parent should update value prop to null/undefined/'' to hide "0"
      if (numValue === 0) {
        return '0'
      }
      // For non-zero values, format and display them
      if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
        return formatValue(numValue)
      }
      return ''
    }

    // If we have a raw input value with single zero, minus sign only, or ending with decimal point, use it for display
    if (rawInputValue !== '') {
      const isSingleZero =
        rawInputValue === '0' ||
        rawInputValue === '-0' ||
        rawInputValue.startsWith('0.') ||
        rawInputValue.startsWith('-0.')
      // Check half-width, full-width minus, katakana long vowel mark (ー), and mathematical minus sign (−)
      const isMinusOnly = allowNegative && (rawInputValue === '-' || rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−')
      const endsWithDecimalPoint =
        allowDecimal &&
        rawInputValue.endsWith('.') &&
        !rawInputValue.endsWith('..')
      if (isSingleZero || isMinusOnly || endsWithDecimalPoint) {
        // If it's full-width minus, katakana long vowel mark, or mathematical minus sign, convert to half-width for display
        if (rawInputValue === '－' || rawInputValue === 'ー' || rawInputValue === '−') {
          return '-'
        }
        return rawInputValue
      }
      
      // If rawInputValue is not empty and doesn't match special cases, use it to calculate display value
      // This handles the case where user is typing but value prop hasn't been updated yet
      const rawAsNumber = Number(rawInputValue)
      if (!Number.isNaN(rawAsNumber) && Number.isFinite(rawAsNumber)) {
        return formatValue(rawAsNumber)
      }
    }

    if (value === null || value === undefined || value === '') {
      return ''
    }

    // Convert value to number if it's a string
    // Escape separator for regex if it exists
    const numValue =
      typeof value === 'string'
        ? Number(
            value.replace(
              new RegExp(`[${separator ? escapeRegex(separator) : ''}]`, 'g'),
              '',
            ),
          )
        : Number(value)

    if (Number.isNaN(numValue)) {
      return ''
    }

    // Format and return the value
    return formatValue(numValue)
  }, [value, formatValue, separator, composingValue, rawInputValue, allowNegative, allowDecimal])

  // Determine appropriate inputMode for mobile keyboards
  const inputMode = allowDecimal ? 'decimal' : 'numeric'

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      value={displayValue}
      className={className}
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onBlur={handleBlur}
      onChange={(e) => {
        // Skip onChange if we just processed composition to avoid duplicate processing
        // This prevents duplicate when composition end and onChange fire in quick succession
        if (hasProcessedComposition.current) {
          return
        }
        handleValueChange(e.target.value)
      }}
      {...props}
    />
  )
}

export { NumericInput }

export type { NumericInputValue, NumericInputProps }
