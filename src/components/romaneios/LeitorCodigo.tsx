import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Leitura de código de barras / QR para o assistente de retirada (RF-09).
 *
 * Funciona nos três cenários do almoxarifado, sem depender de qual deles a
 * empresa usa:
 *
 * 1. **Leitor físico (USB/bluetooth)**: ele se comporta como teclado — digita o
 *    código muito rápido e manda um Enter. O campo fica sempre focado, então
 *    basta bipar.
 * 2. **Câmera do celular**: quando o navegador tem a `BarcodeDetector` nativa
 *    (Chrome/Android), o botão abre a câmera e lê sem instalar nada.
 * 3. **Digitação manual**: o mesmo campo aceita o código na mão e Enter.
 */

// A API nativa ainda não está nos tipos do TypeScript
interface DetectorCodigo {
  detect: (fonte: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}
interface JanelaComDetector {
  BarcodeDetector?: new (opcoes?: { formats?: string[] }) => DetectorCodigo
}

const temDetector = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in (window as unknown as JanelaComDetector)

interface LeitorCodigoProps {
  /** Chamado a cada código lido (bipado, digitado ou visto pela câmera) */
  onLer: (codigo: string) => void
  placeholder?: string
  /** Mantém o foco no campo para o leitor físico funcionar sem clique */
  autoFoco?: boolean
}

export const LeitorCodigo = ({
  onLer,
  placeholder = 'Bipe o código de barras ou digite e aperte Enter',
  autoFoco = true,
}: LeitorCodigoProps) => {
  const [texto, setTexto] = useState('')
  const [camera, setCamera] = useState(false)
  const [iniciandoCamera, setIniciandoCamera] = useState(false)
  const [erroCamera, setErroCamera] = useState<string | null>(null)

  const campoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<number | null>(null)
  // Evita disparar o mesmo código várias vezes enquanto ele está na frente da câmera
  const ultimoLidoRef = useRef<{ codigo: string; em: number }>({ codigo: '', em: 0 })

  const emitir = useCallback(
    (codigo: string) => {
      const limpo = codigo.trim()
      if (!limpo) return

      const agora = Date.now()
      if (ultimoLidoRef.current.codigo === limpo && agora - ultimoLidoRef.current.em < 1500) {
        return
      }
      ultimoLidoRef.current = { codigo: limpo, em: agora }
      onLer(limpo)
    },
    [onLer],
  )

  const pararCamera = useCallback(() => {
    if (loopRef.current !== null) {
      cancelAnimationFrame(loopRef.current)
      loopRef.current = null
    }
    streamRef.current?.getTracks().forEach((trilha) => trilha.stop())
    streamRef.current = null
    setCamera(false)
  }, [])

  // Desligar a câmera ao sair da tela é obrigatório: senão o LED fica aceso
  useEffect(() => () => pararCamera(), [pararCamera])

  const abrirCamera = async () => {
    setErroCamera(null)
    setIniciandoCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setCamera(true)

      // O <video> só existe depois do render, por isso o await do próximo quadro
      await new Promise((resolve) => requestAnimationFrame(resolve))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const Detector = (window as unknown as JanelaComDetector).BarcodeDetector!
      const detector = new Detector({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'itf'],
      })

      const procurar = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const achados = await detector.detect(videoRef.current)
          if (achados.length > 0) emitir(achados[0].rawValue)
        } catch {
          // Quadro ruim (foco, luz): tenta no próximo
        }
        loopRef.current = requestAnimationFrame(() => {
          void procurar()
        })
      }
      void procurar()
    } catch {
      setErroCamera('Não foi possível abrir a câmera. Use o leitor ou digite o código.')
      pararCamera()
    } finally {
      setIniciandoCamera(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={campoRef}
            autoFocus={autoFoco}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              emitir(texto)
              setTexto('')
            }}
            // O leitor físico perde o bipe se o foco escapar
            onBlur={() => {
              if (autoFoco && !camera) setTimeout(() => campoRef.current?.focus(), 80)
            }}
            placeholder={placeholder}
            className="pl-9"
            inputMode="text"
            autoComplete="off"
          />
        </div>

        {temDetector() && (
          <Button
            type="button"
            variant={camera ? 'secondary' : 'outline'}
            onClick={() => (camera ? pararCamera() : abrirCamera())}
            disabled={iniciandoCamera}
          >
            {iniciandoCamera ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : camera ? (
              <CameraOff className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">{camera ? 'Fechar' : 'Câmera'}</span>
          </Button>
        )}
      </div>

      {camera && (
        <div className="relative overflow-hidden rounded-md border bg-black">
          <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-destructive/80" />
        </div>
      )}

      {erroCamera && (
        <Alert variant="destructive">
          <AlertDescription>{erroCamera}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default LeitorCodigo
