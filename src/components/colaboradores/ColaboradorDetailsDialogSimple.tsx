import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { ColaboradorForm } from './ColaboradorForm'
import type { ColaboradorFormData } from '@/lib/validations'

interface ColaboradorDetailsDialogProps {
  colaboradorId: string | null
  isOpen: boolean
  onClose: () => void
  onColaboradorUpdated?: () => void
}

interface ColaboradorDetalhado extends Tables<'colaboradores'> {
  empresa?: { nome: string; cnpj: string | null; logo_url: string | null }
  centro_custo?: { codigo: string; descricao: string | null }
}

export function ColaboradorDetailsDialog({ 
  colaboradorId, 
  isOpen, 
  onClose, 
  onColaboradorUpdated 
}: ColaboradorDetailsDialogProps) {
  console.log('🔍 ColaboradorDetailsDialog rendered with:', { colaboradorId, isOpen, hasOnClose: !!onClose })
  
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [colaborador, setColaborador] = useState<ColaboradorDetalhado | null>(null)

  useEffect(() => {
    if (isOpen && colaboradorId) {
      console.log('🔄 Loading colaborador details for ID:', colaboradorId)
      loadColaboradorDetails()
    }
  }, [isOpen, colaboradorId])

  const loadColaboradorDetails = async () => {
    if (!colaboradorId) return

    setLoading(true)
    try {
      console.log('📋 Fetching colaborador details...')
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          empresa:empresas(nome, cnpj, logo_url),
          centro_custo:centros_custo(codigo, descricao)
        `)
        .eq('id', colaboradorId)
        .single()

      if (error) throw error
      console.log('✅ Colaborador details loaded:', data?.nome)
      setColaborador(data)
    } catch (error) {
      console.error('❌ Error loading colaborador details:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do colaborador",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  console.log('🎭 Rendering dialog with isOpen:', isOpen, 'colaboradorId:', colaboradorId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ 
          position: 'fixed',
          top: '50vh',
          left: '50vw',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          margin: 0
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {loading ? 'Carregando...' : colaborador?.nome || `Colaborador ${colaboradorId}`}
          </DialogTitle>
          <DialogDescription>
            Editar dados do colaborador
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        ) : colaborador ? (
          <ColaboradorForm
            initialData={colaborador}
            onSubmit={async (data: ColaboradorFormData) => {
              try {
                setLoading(true)
                const { data: updated, error } = await supabase
                  .from('colaboradores')
                  .update(data)
                  .eq('id', colaboradorId as string)
                  .select()
                  .single()
                if (error) throw error
                setColaborador(updated as any)
                onColaboradorUpdated?.()
                toast({ title: 'Sucesso', description: 'Colaborador atualizado com sucesso.' })
                onClose()
              } catch (error) {
                console.error('Erro ao atualizar colaborador:', error)
                toast({ title: 'Erro', description: 'Não foi possível atualizar o colaborador.', variant: 'destructive' })
              } finally {
                setLoading(false)
              }
            }}
            onCancel={onClose}
          />
        ) : (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Colaborador não encontrado</p>
            <Button onClick={onClose} className="mt-4">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
