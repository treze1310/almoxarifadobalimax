import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, ExternalLink } from 'lucide-react'
import { ColaboradorDetailsDialog } from './ColaboradorDetailsDialog'

interface ColaboradorClickableLabelProps {
  colaboradorId: string
  colaboradorNome: string
  colaboradorMatricula?: string | null
  colaboradorCargo?: string | null
  colaboradorSetor?: string | null
  variant?: 'default' | 'compact' | 'full'
  className?: string
  onColaboradorUpdated?: () => void
}

export function ColaboradorClickableLabel({ 
  colaboradorId,
  colaboradorNome,
  colaboradorMatricula,
  colaboradorCargo,
  colaboradorSetor,
  variant = 'default',
  className = '',
  onColaboradorUpdated
}: ColaboradorClickableLabelProps) {
  const [showDialog, setShowDialog] = useState(false)

  const handleOpenDialog = () => {
    console.log('🖱️ Colaborador clicked:', colaboradorNome, 'ID:', colaboradorId)
    setShowDialog(true)
    console.log('📱 Dialog state set to:', true)
  }

  const handleCloseDialog = () => {
    console.log('❌ Closing dialog for:', colaboradorNome)
    setShowDialog(false)
  }

  const renderContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {colaboradorNome}
            {colaboradorMatricula && (
              <span className="text-xs text-muted-foreground">({colaboradorMatricula})</span>
            )}
          </span>
        )

      case 'full':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{colaboradorNome}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {colaboradorMatricula && (
                <Badge variant="outline" className="text-xs">
                  {colaboradorMatricula}
                </Badge>
              )}
              {colaboradorCargo && (
                <Badge variant="secondary" className="text-xs">
                  {colaboradorCargo}
                </Badge>
              )}
              {colaboradorSetor && (
                <Badge variant="outline" className="text-xs bg-blue-50">
                  {colaboradorSetor}
                </Badge>
              )}
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
        )

      default:
        return (
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>{colaboradorNome}</span>
            {colaboradorMatricula && (
              <Badge variant="outline" className="text-xs">
                {colaboradorMatricula}
              </Badge>
            )}
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </span>
        )
    }
  }

  return (
    <div>
      <button
        type="button"
        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
        onClick={handleOpenDialog}
        style={{ all: 'unset', cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
      >
        <span className="flex items-center gap-1">
          <User className="w-4 h-4" />
          {colaboradorNome}
          <ExternalLink className="w-3 h-3" />
        </span>
      </button>
      
      <ColaboradorDetailsDialog
        colaboradorId={colaboradorId}
        isOpen={showDialog}
        onClose={handleCloseDialog}
        onColaboradorUpdated={onColaboradorUpdated}
      />
    </div>
  )
}