import type { ComponentProps } from 'react'

export type NumericInputValue = {
  value: number
  formattedValue: string
}

export type NumericInputProps = ComponentProps<'input'> & {
  onValueChange?: (valueObject: NumericInputValue) => void
  separator?: string
  allowDecimal?: boolean
  allowNegative?: boolean
  minValue?: number
  maxValue?: number
  maxDecimalPlaces?: number
}

