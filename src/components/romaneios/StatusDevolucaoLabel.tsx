import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import type { StatusDevolucao } from '@/services/devolucaoService'

interface StatusDevolucaoLabelProps {
  statusDevolucao: StatusDevolucao
  showTooltip?: boolean
  size?: 'sm' | 'default' | 'lg'
}

export function StatusDevolucaoLabel({ 
  statusDevolucao, 
  showTooltip = true,
  size = 'default'
}: StatusDevolucaoLabelProps) {
  const getStatusConfig = (status: StatusDevolucao['status']) => {
    switch (status) {
      case 'nao_devolvido':
        return {
          label: 'Não Devolvido',
          variant: 'secondary' as const,
          icon: XCircle,
          color: 'text-gray-500'
        }
      case 'parcialmente_devolvido':
        return {
          label: 'Parcialmente Devolvido',
          variant: 'warning' as const,
          icon: Clock,
          color: 'text-orange-500'
        }
      case 'totalmente_devolvido':
        return {
          label: 'Totalmente Devolvido',
          variant: 'success' as const,
          icon: CheckCircle,
          color: 'text-green-500'
        }
      default:
        return {
          label: 'Indefinido',
          variant: 'secondary' as const,
          icon: XCircle,
          color: 'text-gray-500'
        }
    }
  }

  const config = getStatusConfig(statusDevolucao.status)
  const Icon = config.icon

  const badgeContent = (
    <Badge variant={config.variant} className={`gap-1 ${size === 'sm' ? 'text-xs px-2 py-1' : ''}`}>
      <Icon className={`h-3 w-3 ${config.color}`} />
      {config.label}
      {statusDevolucao.status !== 'nao_devolvido' && (
        <span className="text-xs opacity-75">
          ({Math.round(statusDevolucao.percentualDevolvido)}%)
        </span>
      )}
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">{config.label}</div>
      <div className="text-sm space-y-1">
        <div>
          <span className="font-medium">Percentual:</span>{' '}
          {statusDevolucao.percentualDevolvido.toFixed(1)}%
        </div>
        <div>
          <span className="font-medium">Quantidade Original:</span>{' '}
          {statusDevolucao.quantidadeOriginal} un
        </div>
        <div>
          <span className="font-medium">Quantidade Devolvida:</span>{' '}
          {statusDevolucao.quantidadeDevolvida} un
        </div>
      </div>
      
      {statusDevolucao.itensDevolvidos.length > 0 && (
        <div className="border-t pt-2">
          <div className="font-medium text-xs mb-1">Itens:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {statusDevolucao.itensDevolvidos.map((item, index) => (
              <div key={index} className="text-xs">
                <div className="font-medium truncate" title={item.nome_material}>
                  {item.nome_material}
                </div>
                <div className="text-gray-600">
                  {item.quantidade_devolvida}/{item.quantidade_original} un ({item.percentual.toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default StatusDevolucaoLabel