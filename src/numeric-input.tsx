'use client'

import { useNumericInput } from './use-numeric-input'
import type { NumericInputProps } from './numeric-input.types'

const NumericInput = ({
  value,
  maxValue,
  minValue,
  separator,
  maxLength,
  className,
  maxDecimalPlaces,
  allowDecimal = false,
  allowNegative = false,
  onBlur,
  onValueChange,
  onCompositionEnd,
  onCompositionStart,
  ...props
}: NumericInputProps) => {
  const {
    inputRef,
    inputMode,
    displayValue,
    hasProcessedComposition,
    handleBlur,
    handleValueChange,
    handleCompositionEnd,
    handleCompositionStart,
  } = useNumericInput({
    value,
    minValue,
    maxValue,
    separator,
    maxLength,
    allowDecimal,
    allowNegative,
    maxDecimalPlaces,
    onBlur,
    onValueChange,
    onCompositionEnd,
    onCompositionStart,
  })

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
