import * as React from 'react'

/** Texto editável separado do número: apagar não recoloca 0/1 a cada tecla. */
export const NumberInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(
  (
    {
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      min,
      max,
      step,
      ...props
    },
    forwardedRef,
  ) => {
    const format = (number: unknown) =>
      number == null || number === '' || !Number.isFinite(Number(number))
        ? ''
        : String(number)
    const [text, setText] = React.useState(() => format(value ?? defaultValue))
    const focused = React.useRef(false)
    const input = React.useRef<HTMLInputElement | null>(null)
    const decimal = step === 'any' || (step != null && Number(step) % 1 !== 0)

    React.useEffect(() => {
      if (
        !focused.current &&
        (value !== undefined || defaultValue === undefined)
      )
        setText(format(value))
    }, [value, defaultValue])

    React.useEffect(() => {
      const number = Number(text.replace(',', '.'))
      let error = ''
      if (text !== '' && !Number.isFinite(number))
        error = 'Informe um número válido.'
      else if (text !== '' && min != null && number < Number(min))
        error = `O valor mínimo é ${min}.`
      else if (text !== '' && max != null && number > Number(max))
        error = `O valor máximo é ${max}.`
      else if (text !== '' && !decimal && !Number.isInteger(number))
        error = 'Informe um número inteiro.'
      input.current?.setCustomValidity(error)
    }, [text, min, max, decimal])

    return (
      <input
        {...props}
        ref={(node) => {
          input.current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) forwardedRef.current = node
        }}
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        role="spinbutton"
        aria-valuemin={min == null ? undefined : Number(min)}
        aria-valuemax={max == null ? undefined : Number(max)}
        aria-valuenow={
          text === '' || !Number.isFinite(Number(text.replace(',', '.')))
            ? undefined
            : Number(text.replace(',', '.'))
        }
        value={text}
        onFocus={(event) => {
          focused.current = true
          // Digitar sobre o zero ou o valor anterior substitui tudo.
          event.currentTarget.select()
          onFocus?.(event)
        }}
        onChange={(event) => {
          const draft = event.target.value.replace(/^(-?)0+(?=\d)/, '$1')
          if (!(decimal ? /^-?\d*(?:[.,]\d*)?$/ : /^-?\d*$/).test(draft)) return
          setText(draft)
          const normalized = draft.replace(',', '.')
          onChange?.({
            ...event,
            target: {
              ...event.target,
              name: event.target.name,
              value: Number.isFinite(Number(normalized)) ? normalized : '',
            },
          } as React.ChangeEvent<HTMLInputElement>)
        }}
        onBlur={(event) => {
          focused.current = false
          const number = Number(text.replace(',', '.'))
          if (text !== '' && Number.isFinite(number)) setText(String(number))
          onBlur?.(event)
        }}
      />
    )
  },
)
NumberInput.displayName = 'NumberInput'
