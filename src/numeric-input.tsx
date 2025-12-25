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
    .replace(/[－]/g, '-') // Convert full-width minus (－) to half-width (-)
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
  ...props
}: NumericInputProps) {
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
      if (!skipCompositionCheck && isComposing.current) {
        setComposingValue(inputValue)
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

      // Normalize the input (remove invalid chars, handle decimals, negatives)
      rawValue = normalizeNumericInput(
        rawValue,
        allowDecimal,
        allowNegative,
        maxLength,
      )

      // Handle empty input first (before processing leading zeros)
      if (rawValue === '' || rawValue === '-') {
        setRawInputValue('')
        onValueChange({
          value: 0,
          formattedValue: '',
        })
        return
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
      // Use requestAnimationFrame to ensure it happens after any pending onChange events
      requestAnimationFrame(() => {
        handleValueChange(finalValue, true)
        // Reset flag after processing
        hasProcessedComposition.current = false
      })
    },
    [onCompositionEnd, handleValueChange],
  )

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // If still composing when blur happens, force end composition
      if (isComposing.current) {
        isComposing.current = false
        const finalValue = e.target.value
        setComposingValue('')
        hasProcessedComposition.current = true
        // Process the value immediately
        handleValueChange(finalValue, true)
      } else if (composingValue !== '') {
        // If there's a composing value but not composing, process it
        handleValueChange(composingValue, true)
        setComposingValue('')
      } else if (!hasProcessedComposition.current && e.target.value) {
        // If we haven't processed composition and there's a value, process it
        handleValueChange(e.target.value, true)
      }

      // Apply min/max validation on blur for any intermediate values
      // This ensures values are clamped even if user was typing an out-of-range value
      if (rawInputValue !== '') {
        const numValue = Number(rawInputValue)
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

      // Reset the flag
      hasProcessedComposition.current = false

      // Call custom onBlur if provided
      if (onBlur) {
        onBlur(e)
      }
    },
    [composingValue, onBlur, handleValueChange, rawInputValue, minValue, maxValue, formatValue],
  )

  // Reset rawInputValue when value prop changes externally (e.g., form reset)
  useEffect(() => {
    if (value === null || value === undefined || value === '') {
      setRawInputValue('')
      return
    }

    // Convert value to number if it's a string
    const numValue =
      typeof value === 'string'
        ? Number(value.replace(new RegExp(`[${separator || ''}]`, 'g'), ''))
        : Number(value)

    // If the value is 0, only preserve rawInputValue if it's "0", "-0", "0.", or "-0."
    if (numValue === 0) {
      const isSingleZero =
        rawInputValue === '0' ||
        rawInputValue === '-0' ||
        rawInputValue.startsWith('0.') ||
        rawInputValue.startsWith('-0.')
      if (!isSingleZero) {
        setRawInputValue('')
      }
      return
    }

    // For non-zero values, check if the numeric value matches what we'd get from rawInputValue
    if (rawInputValue !== '') {
      const rawAsNumber = Number(rawInputValue)
      if (rawAsNumber !== numValue) {
        // Value changed externally, clear rawInputValue
        setRawInputValue('')
      }
    }
  }, [value, separator, rawInputValue])

  // Format the display value
  const displayValue = useMemo(() => {
    // If currently composing, use the composing value (this allows IME input to display)
    if (composingValue !== '') {
      return composingValue
    }

    // If rawInputValue is empty, don't show "0" even if value is 0
    // This handles the case when user deletes "0" by backspace
    if (rawInputValue === '') {
      if (value === null || value === undefined || value === '') {
        return ''
      }
      // Convert value to number if it's a string
      const numValue =
        typeof value === 'string'
          ? Number(value.replace(new RegExp(`[${separator || ''}]`, 'g'), ''))
          : Number(value)
      // If value is 0 and rawInputValue is empty, don't show anything
      if (numValue === 0) {
        return ''
      }
    }

    // If we have a raw input value with single zero or ending with decimal point, use it for display
    if (rawInputValue !== '') {
      const isSingleZero =
        rawInputValue === '0' ||
        rawInputValue === '-0' ||
        rawInputValue.startsWith('0.') ||
        rawInputValue.startsWith('-0.')
      const endsWithDecimalPoint =
        allowDecimal &&
        rawInputValue.endsWith('.') &&
        !rawInputValue.endsWith('..')
      if (isSingleZero || endsWithDecimalPoint) {
        return rawInputValue
      }
    }

    if (value === null || value === undefined || value === '') {
      return ''
    }

    // Convert value to number if it's a string
    const numValue =
      typeof value === 'string'
        ? Number(value.replace(new RegExp(`[${separator || ''}]`, 'g'), ''))
        : Number(value)

    // Allow displaying "0" if rawInputValue is "0"
    if (Number.isNaN(numValue)) {
      return ''
    }

    // If the value is 0 and we don't have a raw input value, return empty
    // But if rawInputValue is "0", we want to show "0"
    if (numValue === 0 && rawInputValue !== '0') {
      return ''
    }

    return formatValue(numValue)
  }, [value, formatValue, separator, composingValue, rawInputValue])

  return (
    <input
      ref={inputRef}
      type="text"
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
