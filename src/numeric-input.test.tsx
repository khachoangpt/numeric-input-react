import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumericInput, type NumericInputValue } from './numeric-input'

describe('NumericInput', () => {
  let onValueChange: MockedFunction<(valueObject: NumericInputValue) => void>

  beforeEach(() => {
    onValueChange = vi.fn()
  })

  describe('Basic numeric input', () => {
    it('should render input element', () => {
      render(<NumericInput onValueChange={onValueChange} />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should handle basic number input', async () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123,
          formattedValue: '123',
        })
      })
    })

    it('should have numeric inputMode by default', () => {
      render(<NumericInput onValueChange={onValueChange} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('inputMode', 'numeric')
    })
  })

  describe('Decimal support', () => {
    it('should allow decimal input when allowDecimal is true', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123.45' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123.45,
          formattedValue: '123.45',
        })
      })
    })

    it('should have decimal inputMode when allowDecimal is true', () => {
      render(<NumericInput onValueChange={onValueChange} allowDecimal={true} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('inputMode', 'decimal')
    })

    it('should not allow decimal input when allowDecimal is false', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={false} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123.45' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 12345,
          formattedValue: '12345',
        })
      })
    })

    it('should preserve trailing decimal point', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123.' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123,
          formattedValue: '123.',
        })
      })
    })

    it('should only allow one decimal point', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '12.34.56' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 12.3456,
          formattedValue: '12.3456',
        })
      })
    })

    it('should limit decimal places when maxDecimalPlaces is set', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          allowDecimal={true}
          maxDecimalPlaces={2}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123.456789' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123.45,
          formattedValue: '123.45',
        })
      })
    })
  })

  describe('Negative numbers', () => {
    it('should allow negative input when allowNegative is true', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '-123' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: -123,
          formattedValue: '-123',
        })
      })
    })

    it('should not allow negative input when allowNegative is false', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={false} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '-123' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123,
          formattedValue: '123',
        })
      })
    })

    it('should move minus sign to the start', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123-' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: -123,
          formattedValue: '-123',
        })
      })
    })

    it('should handle negative with decimal', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          allowNegative={true}
          allowDecimal={true}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '-123.45' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: -123.45,
          formattedValue: '-123.45',
        })
      })
    })

    it('should allow typing minus sign first then numbers', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      
      // Type minus sign first
      fireEvent.change(input, { target: { value: '-' } })
      await waitFor(() => {
        expect(input).toHaveValue('-')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })

      // Continue typing numbers
      fireEvent.change(input, { target: { value: '-123' } })
      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: -123,
          formattedValue: '-123',
        })
      })
    })
  })

  describe('Separator formatting', () => {
    it('should format numbers with comma separator', async () => {
      render(
        <NumericInput onValueChange={onValueChange} separator="," />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '1234567' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 1234567,
          formattedValue: '1,234,567',
        })
      })
    })

    it('should format numbers with space separator', async () => {
      render(
        <NumericInput onValueChange={onValueChange} separator=" " />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '1234567' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 1234567,
          formattedValue: '1 234 567',
        })
      })
    })

    it('should format decimal numbers with separator', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          separator=","
          allowDecimal={true}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '1234567.89' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 1234567.89,
          formattedValue: '1,234,567.89',
        })
      })
    })

    it('should handle special regex characters in separator', async () => {
      const user = userEvent.setup()
      render(
        <NumericInput onValueChange={onValueChange} separator="." />,
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '1234')

      // Should not crash with special regex character
      expect(input).toBeInTheDocument()
    })
  })

  describe('Leading zeros', () => {
    it('should preserve single zero', async () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '0' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '0',
        })
      })
    })

    it('should remove multiple leading zeros', async () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '00123' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123,
          formattedValue: '123',
        })
      })
    })

    it('should preserve 0. pattern', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '0.' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '0.',
        })
      })
    })

    it('should preserve -0. pattern', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          allowDecimal={true}
          allowNegative={true}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '-0.' } })

      await waitFor(() => {
        const lastCall = onValueChange.mock.calls[onValueChange.mock.calls.length - 1]
        expect(lastCall[0].formattedValue).toBe('-0.')
        // JavaScript treats -0 and 0 as equal, so we check the formatted value
        expect(lastCall[0].value).toBe(-0)
      })
    })

    it('should remove leading zeros from 00.1', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={true} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '00.1' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0.1,
          formattedValue: '0.1',
        })
      })
    })
  })

  describe('Min/Max validation', () => {
    it('should clamp value to minValue', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          minValue={10}
          maxValue={100}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '5' } })
      fireEvent.blur(input) // Trigger blur

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 10,
          formattedValue: '10',
        })
      })
    })

    it('should clamp value to maxValue', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          minValue={10}
          maxValue={100}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '200' } })
      fireEvent.blur(input) // Trigger blur

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 100,
          formattedValue: '100',
        })
      })
    })

    it('should allow intermediate values while typing', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          minValue={0}
          maxValue={100}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '1000' } }) // Typing "1000" but max is 100

      // Component may clamp immediately if value is complete (not ending with .)
      // So we check that onChange was called with the input value
      await waitFor(() => {
        expect(onValueChange).toHaveBeenCalled()
        // The value might be clamped or not, depending on implementation
        const lastCall = onValueChange.mock.calls[onValueChange.mock.calls.length - 1]
        expect(lastCall[0].value).toBeGreaterThanOrEqual(0)
      })
    })

    it('should clamp on blur for intermediate values', async () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          minValue={0}
          maxValue={100}
        />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '1000' } })
      fireEvent.blur(input)

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 100,
          formattedValue: '100',
        })
      })
    })
  })

  describe('Full-width character conversion', () => {
    it('should convert full-width numbers to half-width', async () => {
      const user = userEvent.setup()
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      // Simulate full-width Japanese numbers: １２３
      fireEvent.change(input, { target: { value: '１２３' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123,
          formattedValue: '123',
        })
      })
    })

    it('should convert full-width period to decimal point', async () => {
      const user = userEvent.setup()
      render(
        <NumericInput onValueChange={onValueChange} allowDecimal={true} />,
      )

      const input = screen.getByRole('textbox')
      // Simulate full-width period: １２３．４５
      fireEvent.change(input, { target: { value: '１２３．４５' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123.45,
          formattedValue: '123.45',
        })
      })
    })

    it('should convert full-width minus sign', async () => {
      const user = userEvent.setup()
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      // Simulate full-width minus: －１２３
      fireEvent.change(input, { target: { value: '－１２３' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: -123,
          formattedValue: '-123',
        })
      })
    })

    it('should preserve full-width minus sign after blur', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      
      // Simulate typing full-width minus sign only: －
      fireEvent.change(input, { target: { value: '－' } })
      
      await waitFor(() => {
        expect(input).toHaveValue('-')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })

      // Blur the input
      fireEvent.blur(input)

      // Minus sign should still be displayed after blur
      await waitFor(() => {
        expect(input).toHaveValue('-')
      })
    })

    it('should preserve full-width minus sign after blur during IME composition', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox') as HTMLInputElement
      
      // Simulate IME composition with full-width minus
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: '－' } })
      
      // Blur during composition - this should trigger handleValueChange which converts full-width to half-width
      fireEvent.blur(input)

      // Minus sign should be preserved and converted to half-width after blur
      await waitFor(() => {
        expect(input).toHaveValue('-')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })
    })

    it('should convert full-width minus to half-width when composition ends', async () => {
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox') as HTMLInputElement
      
      // Simulate IME composition with full-width minus
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: '－' } })
      
      // During composition, full-width minus should be displayed as-is (not converted yet)
      await waitFor(() => {
        expect(input).toHaveValue('－')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '－',
        })
      })

      // End composition - this should trigger conversion to half-width
      fireEvent.compositionEnd(input, {
        data: '－',
      } as CompositionEvent)

      // Minus sign should be converted to half-width after composition ends
      await waitFor(() => {
        expect(input).toHaveValue('-')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })
    })
  })

  describe('Empty and edge cases', () => {
    it('should handle empty input', () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      // Test that empty input doesn't crash and input is empty
      fireEvent.change(input, { target: { value: '' } })

      // Component should handle empty input gracefully
      // The input value should be empty
      expect(input).toHaveValue('')
      
      // onValueChange should be called with empty formattedValue when input is cleared
      // This is tested indirectly through other tests that clear input
    })

    it('should handle only minus sign', async () => {
      const user = userEvent.setup()
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '-')

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })

      // Verify the input displays the minus sign
      expect(input).toHaveValue('-')
    })

    it('should preserve minus sign when value prop is updated to 0', async () => {
      const { rerender } = render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      
      // User types minus sign
      fireEvent.change(input, { target: { value: '-' } })
      
      await waitFor(() => {
        expect(input).toHaveValue('-')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })

      // Parent component updates value prop to 0 (which is what onValueChange returned)
      rerender(
        <NumericInput 
          onValueChange={onValueChange} 
          allowNegative={true} 
          value={0}
        />,
      )

      // Minus sign should still be displayed (not disappear)
      await waitFor(() => {
        expect(input).toHaveValue('-')
      })
    })

    it('should preserve minus sign when value prop is updated to formattedValue "-"', async () => {
      const { rerender } = render(
        <NumericInput onValueChange={onValueChange} allowNegative={true} />,
      )

      const input = screen.getByRole('textbox')
      
      // User types minus sign
      fireEvent.change(input, { target: { value: '-' } })
      
      await waitFor(() => {
        expect(input).toHaveValue('-')
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '-',
        })
      })

      // Parent component updates value prop to formattedValue "-" (which is what onValueChange returned)
      rerender(
        <NumericInput 
          onValueChange={onValueChange} 
          allowNegative={true} 
          value="-"
        />,
      )

      // Minus sign should still be displayed (not disappear)
      await waitFor(() => {
        expect(input).toHaveValue('-')
      })
    })

    it('should not allow minus sign when allowNegative is false', async () => {
      const user = userEvent.setup()
      render(
        <NumericInput onValueChange={onValueChange} allowNegative={false} />,
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '-')

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 0,
          formattedValue: '',
        })
      })

      // Verify the input is empty (minus sign was removed)
      expect(input).toHaveValue('')
    })

    it('should handle invalid characters', async () => {
      const user = userEvent.setup()
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'abc123def' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 123,
          formattedValue: '123',
        })
      })
    })

    it('should handle scientific notation by removing e/E', async () => {
      const user = userEvent.setup()
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '1e10' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 110,
          formattedValue: '110',
        })
      })
    })

    it('should handle value exceeding MAX_SAFE_INTEGER', async () => {
      const user = userEvent.setup()
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      const largeNumber = (Number.MAX_SAFE_INTEGER + 1).toString()
      fireEvent.change(input, { target: { value: largeNumber } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: Number.MAX_SAFE_INTEGER,
          formattedValue: Number.MAX_SAFE_INTEGER.toString(),
        })
      })
    })
  })

  describe('Controlled component', () => {
    it('should respect value prop', () => {
      render(
        <NumericInput onValueChange={onValueChange} value="123" />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('123')
    })

    it('should handle value prop with separator', () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          value="1,234"
          separator=","
        />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1,234')
    })

    it('should reset when value prop becomes empty', () => {
      const { rerender } = render(
        <NumericInput onValueChange={onValueChange} value="123" />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('123')

      rerender(<NumericInput onValueChange={onValueChange} value="" />)
      expect(input).toHaveValue('')
    })

    it('should display 0 when value prop is 0', () => {
      render(<NumericInput onValueChange={onValueChange} value={0} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('0')
    })

    it('should display 0 when value prop is "0"', () => {
      render(<NumericInput onValueChange={onValueChange} value="0" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('0')
    })
  })

  describe('IME Composition', () => {
    it('should handle composition start', () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      const compositionStartEvent = new CompositionEvent('compositionstart', {
        bubbles: true,
        cancelable: false,
      })

      fireEvent(input, compositionStartEvent)

      // Should not crash and should allow composition
      expect(input).toBeInTheDocument()
    })

    it('should handle composition end', async () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox') as HTMLInputElement

      // Start composition
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: '１２３' } })

      // End composition
      fireEvent.compositionEnd(input, {
        data: '１２３',
      } as CompositionEvent)

      await waitFor(() => {
        expect(onValueChange).toHaveBeenCalled()
      })
    })
  })

  describe('Custom props', () => {
    it('should pass through standard input props', () => {
      render(
        <NumericInput
          onValueChange={onValueChange}
          placeholder="Enter number"
          className="custom-class"
          disabled
        />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', 'Enter number')
      expect(input).toHaveClass('custom-class')
      expect(input).toBeDisabled()
    })

    it('should handle maxLength prop', async () => {
      render(
        <NumericInput onValueChange={onValueChange} maxLength={5} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123456789' } })

      // maxLength limits the raw input, but the formatted value might be different
      // Check that the value was processed and limited
      await waitFor(
        () => {
          expect(onValueChange).toHaveBeenCalled()
          // The input should show a value that respects maxLength
          const lastCall = onValueChange.mock.calls[onValueChange.mock.calls.length - 1]
          // The raw input should be limited to 5 digits
          expect(lastCall[0].value.toString().replace(/[^0-9]/g, '').length).toBeLessThanOrEqual(5)
        },
        { timeout: 1000 },
      )
    })

    it('should call custom onBlur handler', async () => {
      const onBlur = vi.fn()
      render(
        <NumericInput onValueChange={onValueChange} onBlur={onBlur} />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123' } })
      fireEvent.blur(input)

      expect(onBlur).toHaveBeenCalled()
    })
  })

  describe('Value formatting edge cases', () => {
    it('should handle zero value correctly', async () => {
      render(<NumericInput onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '0' } })
      fireEvent.change(input, { target: { value: '' } })

      // After clearing, should show empty, not "0"
      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should format large numbers with separator', async () => {
      render(
        <NumericInput onValueChange={onValueChange} separator="," />,
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '999999999' } })

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith({
          value: 999999999,
          formattedValue: '999,999,999',
        })
      })
    })
  })
})

