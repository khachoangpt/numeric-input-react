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
  onKeyDown,
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
      onKeyDown={(e) => {
        if ((e.key === 'Backspace' || e.key === 'Delete') && separator) {
          const target = e.currentTarget
          const selectionStart = target.selectionStart ?? 0
          const selectionEnd = target.selectionEnd ?? 0
          const hasSelection = selectionStart !== selectionEnd

          if (e.key === 'Backspace') {
            if (!hasSelection && selectionStart > 0) {
              const previousChar = target.value[selectionStart - 1]
              if (previousChar === separator) {
                let digitIndexToDelete = selectionStart - 2

                while (
                  digitIndexToDelete >= 0 &&
                  !/\d/.test(target.value[digitIndexToDelete] ?? '')
                ) {
                  digitIndexToDelete--
                }

                if (digitIndexToDelete >= 0) {
                  e.preventDefault()
                  const nextValue =
                    target.value.slice(0, digitIndexToDelete) +
                    target.value.slice(digitIndexToDelete + 1)

                  handleValueChange(nextValue, {
                    selectionContext: {
                      displayValue: nextValue,
                      selectionStart: digitIndexToDelete,
                      selectionEnd: digitIndexToDelete,
                    },
                  })
                }
              }
            }
          } else if (e.key === 'Delete') {
            if (!hasSelection && selectionStart < target.value.length) {
              const currentChar = target.value[selectionStart]
              if (currentChar === separator) {
                let digitIndexToDelete = selectionStart + 1

                while (
                  digitIndexToDelete < target.value.length &&
                  !/\d/.test(target.value[digitIndexToDelete] ?? '')
                ) {
                  digitIndexToDelete++
                }

                if (digitIndexToDelete < target.value.length) {
                  e.preventDefault()
                  const nextValue =
                    target.value.slice(0, digitIndexToDelete) +
                    target.value.slice(digitIndexToDelete + 1)

                  handleValueChange(nextValue, {
                    selectionContext: {
                      displayValue: nextValue,
                      selectionStart: selectionStart,
                      selectionEnd: selectionStart,
                    },
                  })
                }
              }
            }
          }
        }

        onKeyDown?.(e)
      }}
      onChange={(e) => {
        // Skip onChange if we just processed composition to avoid duplicate processing
        // This prevents duplicate when composition end and onChange fire in quick succession
        if (hasProcessedComposition.current) {
          return
        }
        const target = e.target
        handleValueChange(target.value, {
          selectionContext: {
            displayValue: target.value,
            selectionStart: target.selectionStart ?? 0,
            selectionEnd: target.selectionEnd ?? 0,
          },
        })
      }}
      {...props}
    />
  )
}

export { NumericInput }
