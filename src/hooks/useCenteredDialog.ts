import { useEffect, useState } from 'react'

interface ViewportPosition {
  top: string
  left: string
  transform: string
}

export const useCenteredDialog = (isOpen: boolean): ViewportPosition => {
  const [position, setPosition] = useState<ViewportPosition>({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  })

  useEffect(() => {
    if (isOpen) {
      // Calcula o centro da viewport atual
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

      // Posiciona o dialog no centro da tela visível atual
      const centerY = scrollTop + (viewportHeight / 2)
      const centerX = scrollLeft + (viewportWidth / 2)

      setPosition({
        top: `${centerY}px`,
        left: `${centerX}px`,
        transform: 'translate(-50%, -50%)'
      })
    }
  }, [isOpen])

  return position
}