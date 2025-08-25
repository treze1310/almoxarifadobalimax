import React from 'react'
import { test, expect } from 'vitest'
import { render } from '@testing-library/react'
import App from '../src/App'

test('The applications renders correctly', () => {
  const { container } = render(<App />)

  expect(container.childNodes).not.toHaveLength(0)
})
