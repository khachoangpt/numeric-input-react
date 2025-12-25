# numeric-input-react

A React component for handling numeric input with advanced features including decimal support, negative numbers, thousands separators, and IME composition handling.

## Features

- ✅ **Decimal number support** - Allow or disallow decimal points
- ✅ **Negative number support** - Optional negative number input
- ✅ **Thousands separator** - Customizable separator for number formatting
- ✅ **Min/Max value validation** - Set minimum and maximum value constraints
- ✅ **Full-width character conversion** - Automatically converts full-width Japanese characters (０-９, ．, ，, －) to half-width equivalents
- ✅ **IME composition handling** - Properly handles IME input methods
- ✅ **Leading zero handling** - Smart handling of leading zeros
- ✅ **TypeScript support** - Fully typed with TypeScript
- ✅ **React 19 compatible** - Built for React 19

## Installation

```bash
npm install numeric-input-react
```

## Usage

```tsx
import { NumericInput } from 'numeric-input-react'

function App() {
  const [value, setValue] = useState({ value: 0, formattedValue: '' })

  return (
    <NumericInput
      value={value.formattedValue}
      onValueChange={setValue}
      allowDecimal={true}
      allowNegative={true}
      separator=","
      placeholder="Enter a number"
    />
  )
}
```

## Props

### NumericInputProps

Extends all standard HTML input props (`ComponentProps<'input'>`) with the following additional props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onValueChange` | `(valueObject: NumericInputValue) => void` | **Required** | Callback function that receives the numeric value and formatted string |
| `separator` | `string` | `undefined` | Thousands separator (e.g., `","` for comma, `" "` for space) |
| `allowDecimal` | `boolean` | `false` | Whether to allow decimal point input |
| `allowNegative` | `boolean` | `false` | Whether to allow negative numbers |
| `minValue` | `number` | `undefined` | Minimum allowed value. Values below this will be clamped to `minValue` |
| `maxValue` | `number` | `undefined` | Maximum allowed value. Values above this will be clamped to `maxValue` |

### NumericInputValue

The callback receives an object with:

```typescript
type NumericInputValue = {
  value: number        // The numeric value
  formattedValue: string // The formatted string (with separator if provided)
}
```

## Examples

### Basic numeric input

```tsx
<NumericInput
  onValueChange={(val) => console.log(val.value)}
  placeholder="Enter number"
/>
```

### With decimal support

```tsx
<NumericInput
  allowDecimal={true}
  onValueChange={(val) => console.log(val.value)}
  placeholder="Enter decimal number"
/>
```

### With negative numbers

```tsx
<NumericInput
  allowNegative={true}
  onValueChange={(val) => console.log(val.value)}
  placeholder="Enter number (can be negative)"
/>
```

### With thousands separator

```tsx
<NumericInput
  separator=","
  onValueChange={(val) => {
    console.log('Numeric value:', val.value)
    console.log('Formatted:', val.formattedValue) // e.g., "1,234,567"
  }}
  placeholder="Enter number"
/>
```

### With min/max value constraints

```tsx
<NumericInput
  minValue={0}
  maxValue={100}
  onValueChange={(val) => console.log(val.value)}
  placeholder="Enter number (0-100)"
/>
```

### Full example with all features

```tsx
import { useState } from 'react'
import { NumericInput } from 'numeric-input-react'

function PriceInput() {
  const [price, setPrice] = useState({ value: 0, formattedValue: '' })

  return (
    <div>
      <NumericInput
        value={price.formattedValue}
        onValueChange={setPrice}
        allowDecimal={true}
        allowNegative={false}
        separator=","
        minValue={0}
        maxValue={1000000}
        placeholder="Enter price (0 - 1,000,000)"
        className="price-input"
      />
      <p>Value: {price.value}</p>
      <p>Formatted: {price.formattedValue}</p>
    </div>
  )
}
```

## Behavior

### Leading Zeros
- Single `0` is preserved when typed
- Multiple leading zeros (e.g., `001`, `0123`) are automatically removed
- `0.` and `-0.` patterns are preserved to allow decimal input

### Decimal Points
- Only one decimal point is allowed
- If `allowDecimal` is `false`, decimal points are removed
- Values ending with `.` (e.g., `123.`) are preserved to allow continued typing

### Negative Numbers
- Negative sign (`-`) can only appear at the start
- If `allowNegative` is `false`, negative signs are removed
- Multiple negative signs are normalized to a single sign at the start

### Min/Max Value Validation
- Values are automatically clamped to the `minValue` and `maxValue` range when the input is complete
- Intermediate values (e.g., values ending with `.` or during typing) are allowed temporarily for better UX
- Values are validated and clamped when:
  - The input value is complete (not ending with decimal point)
  - The input loses focus (on blur)
- If a value exceeds the maximum, it will be clamped to `maxValue`
- If a value is below the minimum, it will be clamped to `minValue`

### Full-width Character Conversion
The component automatically converts full-width Japanese characters to half-width:
- `０-９` → `0-9`
- `．` → `.`
- `，` → `,`
- `－` → `-`

### IME Composition
The component properly handles IME (Input Method Editor) composition events, ensuring correct behavior when using Japanese, Chinese, or other IME-based input methods.

## TypeScript

The library is written in TypeScript and includes full type definitions:

```typescript
import { NumericInput, type NumericInputProps, type NumericInputValue } from 'numeric-input-react'
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
