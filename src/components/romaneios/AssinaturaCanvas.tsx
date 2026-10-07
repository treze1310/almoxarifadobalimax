import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Assinatura digital do recebedor (RF-09, 3º passo).
 *
 * Desenha com Pointer Events, então funciona igual com dedo, caneta e mouse —
 * o almoxarife pode colher a assinatura no tablet, no celular ou no desktop.
 * O resultado sai como PNG em data URL, formato que o romaneio guarda e o PDF
 * embute direto.
 */

interface AssinaturaCanvasProps {
  /** Recebe o PNG em data URL, ou null quando a assinatura é apagada */
  onMudar: (assinatura: string | null) => void
  altura?: number
}

export const AssinaturaCanvas = ({ onMudar, altura = 180 }: AssinaturaCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhandoRef = useRef(false)
  const [temTraco, setTemTraco] = useState(false)

  // O canvas é redimensionado pelo CSS; sem acertar a resolução pela densidade
  // da tela, o traço sai borrado no celular.
  const ajustarResolucao = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const densidade = window.devicePixelRatio || 1
    const largura = canvas.clientWidth

    canvas.width = largura * densidade
    canvas.height = altura * densidade

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(densidade, densidade)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // currentColor não existe no canvas: lê a cor do texto já resolvida
    ctx.strokeStyle = getComputedStyle(canvas).color
  }, [altura])

  useEffect(() => {
    ajustarResolucao()
    window.addEventListener('resize', ajustarResolucao)
    return () => window.removeEventListener('resize', ajustarResolucao)
  }, [ajustarResolucao])

  const posicao = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const retangulo = evento.currentTarget.getBoundingClientRect()
    return { x: evento.clientX - retangulo.left, y: evento.clientY - retangulo.top }
  }

  const comecar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    // Captura o ponteiro para o traço não cortar se o dedo sair do canvas
    evento.currentTarget.setPointerCapture(evento.pointerId)
    desenhandoRef.current = true
    const { x, y } = posicao(evento)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const mover = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhandoRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = posicao(evento)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!temTraco) setTemTraco(true)
  }

  const terminar = () => {
    if (!desenhandoRef.current) return
    desenhandoRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    onMudar(temTraco ? canvas.toDataURL('image/png') : null)
  }

  const limpar = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTemTraco(false)
    onMudar(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-md border bg-background">
        <canvas
          ref={canvasRef}
          style={{ height: altura, touchAction: 'none' }}
          className="w-full cursor-crosshair"
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
        />
        {!temTraco && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-ds-body text-muted-foreground">
            Assine aqui
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-dashed" />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={limpar} disabled={!temTraco}>
          <Eraser className="mr-2 h-4 w-4" />
          Apagar e assinar de novo
        </Button>
      </div>
    </div>
  )
}

export default AssinaturaCanvas
