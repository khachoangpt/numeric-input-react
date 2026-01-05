import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, useCallback } from 'react'
import { NumericInput } from './numeric-input'
import type { NumericInputProps, NumericInputValue } from './numeric-input.types'

// Wrapper component that maintains its own state
const NumericInputWithState = (props: Omit<NumericInputProps, 'onValueChange'>) => {
  const [value, setValue] = useState<NumericInputValue>({
    value: 0,
    formattedValue: '',
  })


  const handleValueChange = useCallback((val: NumericInputValue) => {
    setValue(val)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '300px' }}>
      <NumericInput
        {...props}
        value={value.formattedValue}
        onValueChange={handleValueChange}
      />
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        <div>Value: {value.value}</div>
        <div>Formatted: {value.formattedValue || '(empty)'}</div>
      </div>
    </div>
  )
}

const meta = {
  title: 'Components/NumericInput',
  component: NumericInputWithState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    separator: {
      control: 'text',
      description: 'Thousands separator character (default: comma)',
    },
    allowDecimal: {
      control: 'boolean',
      description: 'Allow decimal point input',
    },
    allowNegative: {
      control: 'boolean',
      description: 'Allow negative numbers',
    },
    minValue: {
      control: 'number',
      description: 'Minimum allowed value',
    },
    maxValue: {
      control: 'number',
      description: 'Maximum allowed value',
    },
    maxDecimalPlaces: {
      control: 'number',
      description: 'Maximum number of decimal places',
    },
  },
} satisfies Meta<typeof NumericInputWithState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter a number',
  },
}

export const WithDecimals: Story = {
  args: {
    placeholder: 'Enter a decimal number',
    allowDecimal: true,
  },
}

export const WithNegativeNumbers: Story = {
  args: {
    placeholder: 'Enter a number (can be negative)',
    allowNegative: true,
  },
}

export const WithDecimalsAndNegative: Story = {
  args: {
    placeholder: 'Enter a decimal (can be negative)',
    allowDecimal: true,
    allowNegative: true,
  },
}

export const WithThousandsSeparator: Story = {
  args: {
    placeholder: 'Enter a large number',
    separator: ',',
  },
}

export const WithCustomSeparator: Story = {
  args: {
    placeholder: 'Enter a number (space separator)',
    separator: ' ',
  },
}

export const WithMinMax: Story = {
  args: {
    placeholder: 'Enter a number between 0 and 100',
    minValue: 0,
    maxValue: 100,
  },
}

export const WithMaxDecimalPlaces: Story = {
  args: {
    placeholder: 'Enter a number (max 2 decimals)',
    allowDecimal: true,
    maxDecimalPlaces: 2,
  },
}

export const FullFeatured: Story = {
  args: {
    placeholder: 'Enter amount',
    allowDecimal: true,
    allowNegative: true,
    separator: ',',
    minValue: -1000,
    maxValue: 1000,
    maxDecimalPlaces: 2,
  },
}

export const CurrencyInput: Story = {
  args: {
    placeholder: 'Enter amount',
    allowDecimal: true,
    separator: ',',
    maxDecimalPlaces: 2,
    minValue: 0,
  },
}

export const IntegerOnly: Story = {
  args: {
    placeholder: 'Enter an integer',
    allowDecimal: false,
    allowNegative: true,
    separator: ',',
  },
}

export const WithAllInputProps: Story = {
  args: {
    placeholder: 'Enter a number',
    allowDecimal: true,
    allowNegative: true,
    separator: ',',
    className: 'custom-input',
    style: { padding: '10px', fontSize: '16px', border: '2px solid #007bff' },
  },
}

