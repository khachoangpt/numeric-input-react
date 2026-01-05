import {
  type CompositionEvent,
  type FocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  convertFullWidthToHalfWidth,
  isMinusSign,
  normalizeMinusSign,
  normalizeNumericInput,
  parseValueProp,
} from './numeric-input.utils'
import type { NumericInputValue, NumericInputProps } from './numeric-input.types'

type UseNumericInputOptions = {
  value: NumericInputProps['value']
  separator?: string
  allowDecimal?: boolean
  allowNegative?: boolean
  minValue?: number
  maxValue?: number
  maxDecimalPlaces?: number
  maxLength?: number
  onValueChange: (valueObject: NumericInputValue) => void
  onCompositionStart?: NumericInputProps['onCompositionStart']
  onCompositionEnd?: NumericInputProps['onCompositionEnd']
  onBlur?: NumericInputProps['onBlur']
}

export const useNumericInput = (options: UseNumericInputOptions) => {
  const {
    value,
    maxValue,
    minValue,
    separator,
    maxLength,
    maxDecimalPlaces,
    allowDecimal = false,
    allowNegative = false,
    onBlur,
    onValueChange,
    onCompositionEnd,
    onCompositionStart,
  } = options

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
      const shouldKeepSingleZero =
        rawValue === '0' ||
        rawValue === '-0' ||
        rawValue === '0.' ||
        rawValue === '-0.'

      if (!shouldKeepSingleZero) {
        const hasMinus = rawValue.startsWith('-')
        const withoutMinus = hasMinus ? rawValue.slice(1) : rawValue
        const hasDecimal = withoutMinus.includes('.')

        if (hasDecimal) {
          const [integerPart, decimalPart] = withoutMinus.split('.')
          const cleanedInteger = integerPart.replace(/^0+/, '')
          const prefix = hasMinus ? '-' : ''
          if (cleanedInteger === '' && decimalPart) {
            rawValue = `${prefix}0.${decimalPart}`
          } else if (cleanedInteger === '') {
            rawValue = `${prefix}0`
          } else {
            rawValue = `${prefix}${cleanedInteger}.${decimalPart}`
          }
        } else {
          const cleaned = withoutMinus.replace(/^0+/, '')
          const prefix = hasMinus ? '-' : ''
          rawValue = cleaned === '' ? `${prefix}0` : `${prefix}${cleaned}`
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

  // Helper to process value after conversion (used in composition end and blur)
  const processConvertedValue = useCallback(
    (convertedValue: string) => {
      if (allowNegative && convertedValue === '-') {
        setRawInputValue('-')
        onValueChange({
          value: 0,
          formattedValue: '-',
        })
      } else {
        handleValueChange(convertedValue, true)
      }
    },
    [allowNegative, handleValueChange, onValueChange],
  )

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false
      const finalValue = e.currentTarget.value
      setComposingValue('')
      hasProcessedComposition.current = true

      if (onCompositionEnd) {
        onCompositionEnd(e)
      }

      requestAnimationFrame(() => {
        const convertedValue = convertFullWidthToHalfWidth(finalValue)
        processConvertedValue(convertedValue)
        hasProcessedComposition.current = false
      })
    },
    [onCompositionEnd, processConvertedValue],
  )

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const currentValue = e.target.value
      const shouldPreserveMinus =
        allowNegative && (isMinusSign(rawInputValue) || isMinusSign(currentValue))

      // Handle composition states
      if (isComposing.current) {
        isComposing.current = false
        const convertedValue = convertFullWidthToHalfWidth(e.target.value)
        setComposingValue('')
        hasProcessedComposition.current = true
        processConvertedValue(convertedValue)
      } else if (composingValue !== '') {
        const convertedValue = convertFullWidthToHalfWidth(composingValue)
        processConvertedValue(convertedValue)
        setComposingValue('')
      } else if (!hasProcessedComposition.current && e.target.value) {
        const convertedValue = convertFullWidthToHalfWidth(e.target.value)
        handleValueChange(convertedValue, true)
      }

      // Apply min/max validation on blur
      if (rawInputValue !== '' && !(allowNegative && isMinusSign(rawInputValue))) {
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

      // Normalize minus sign to half-width if needed
      if (shouldPreserveMinus && isMinusSign(rawInputValue) && rawInputValue !== '-') {
        setRawInputValue('-')
        onValueChange({
          value: 0,
          formattedValue: '-',
        })
      }

      hasProcessedComposition.current = false

      if (onBlur) {
        onBlur(e)
      }
    },
    [
      composingValue,
      onBlur,
      handleValueChange,
      rawInputValue,
      minValue,
      maxValue,
      formatValue,
      allowNegative,
      processConvertedValue,
    ],
  )

  // Reset rawInputValue when value prop changes externally (e.g., form reset)
  useEffect(() => {
    const numValue = parseValueProp(value, separator)

    if (Number.isNaN(numValue)) {
      // Preserve minus sign if allowNegative is true and user is typing
      if (allowNegative && isMinusSign(rawInputValue)) {
        return
      }
      setRawInputValue('')
      return
    }

    // If the value is 0, preserve rawInputValue if it's a special pattern
    if (numValue === 0) {
      const isSingleZero =
        rawInputValue === '0' ||
        rawInputValue === '-0' ||
        isMinusSign(rawInputValue) ||
        rawInputValue.startsWith('0.') ||
        rawInputValue.startsWith('-0.')

      // Check if rawInputValue is a negative number (preserve it when allowNegative is true)
      if (allowNegative && rawInputValue !== '') {
        const convertedRawValue = convertFullWidthToHalfWidth(rawInputValue)
        const rawAsNumber = Number(convertedRawValue)
        if (
          !Number.isNaN(rawAsNumber) &&
          Number.isFinite(rawAsNumber) &&
          rawAsNumber < 0
        ) {
          return
        }
      }

      if (!isSingleZero) {
        setRawInputValue('0')
      }
      return
    }

    // For non-zero values, check if the numeric value matches what we'd get from rawInputValue
    if (rawInputValue !== '') {
      // Preserve minus sign only if allowNegative is true
      if (allowNegative && isMinusSign(rawInputValue)) {
        return
      }

      const convertedRawValue = convertFullWidthToHalfWidth(rawInputValue)
      const rawAsNumber = Number(convertedRawValue)

      if (allowNegative && convertedRawValue.startsWith('-')) {
        if (rawAsNumber === numValue) {
          return
        } else if (numValue > 0 && Math.abs(rawAsNumber) === numValue) {
          setRawInputValue('')
        } else {
          return
        }
      } else if (rawAsNumber !== numValue) {
        setRawInputValue('')
      }
    }
  }, [value, separator, rawInputValue, allowNegative])

  // Format the display value
  const displayValue = useMemo(() => {
    if (composingValue !== '') {
      return composingValue
    }

    if (rawInputValue === '') {
      const numValue = parseValueProp(value, separator)
      if (Number.isNaN(numValue)) {
        return ''
      }
      if (numValue === 0) {
        return '0'
      }
      if (Number.isFinite(numValue)) {
        return formatValue(numValue)
      }
      return ''
    }

    if (rawInputValue !== '') {
      const isSingleZero =
        rawInputValue === '0' ||
        rawInputValue === '-0' ||
        rawInputValue.startsWith('0.') ||
        rawInputValue.startsWith('-0.')
      const isMinusOnly = allowNegative && isMinusSign(rawInputValue)
      const endsWithDecimalPoint =
        allowDecimal &&
        rawInputValue.endsWith('.') &&
        !rawInputValue.endsWith('..')

      if (isSingleZero || isMinusOnly || endsWithDecimalPoint) {
        return normalizeMinusSign(rawInputValue)
      }

      const rawAsNumber = Number(rawInputValue)
      if (!Number.isNaN(rawAsNumber) && Number.isFinite(rawAsNumber)) {
        return formatValue(rawAsNumber)
      }
    }

    const numValue = parseValueProp(value, separator)
    if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
      return ''
    }

    return formatValue(numValue)
  }, [value, formatValue, separator, composingValue, rawInputValue, allowNegative, allowDecimal])

  // Determine appropriate inputMode for mobile keyboards
  const inputMode: 'decimal' | 'numeric' = allowDecimal ? 'decimal' : 'numeric'

  return {
    inputRef,
    inputMode,
    displayValue,
    hasProcessedComposition,
    handleBlur,
    handleValueChange,
    handleCompositionEnd,
    handleCompositionStart,
  }
}

