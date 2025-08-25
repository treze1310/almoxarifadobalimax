import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, PROFILE_LABELS, PROFILE_DESCRIPTIONS } from '@/types/auth'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Mail, Building2, Shield, Clock, User as UserIcon } from 'lucide-react'

interface UsuarioDetailsDialogProps {
  usuario: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsuarioDetailsDialog({ 
  usuario, 
  open, 
  onOpenChange 
}: UsuarioDetailsDialogProps) {
  if (!usuario) return null

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return 'Nunca acessou'
    try {
      return formatDistanceToNow(new Date(lastAccess), { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return 'Data inválida'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Data inválida'
    }
  }

  const getProfileColor = (perfil: string) => {
    switch (perfil) {
      case 'administrador': return 'destructive'
      case 'almoxarife': return 'default'
      case 'supervisor': return 'secondary'
      case 'solicitante': return 'outline'
      case 'visualizador': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Detalhes do Usuário
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre o usuário do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações básicas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{usuario.nome}</div>
                <div className="text-sm text-muted-foreground">Nome completo</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{usuario.email}</div>
                <div className="text-sm text-muted-foreground">Email de acesso</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Perfil e Permissões */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={getProfileColor(usuario.perfil)}>
                    {PROFILE_LABELS[usuario.perfil]}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {PROFILE_DESCRIPTIONS[usuario.perfil]}
                </div>
              </div>
            </div>

            {(usuario as any).centros_custo && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {(usuario as any).centros_custo.codigo} - {(usuario as any).centros_custo.descricao}
                  </div>
                  <div className="text-sm text-muted-foreground">Centro de custo</div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Status e Atividade */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                {usuario.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatLastAccess(usuario.ultimo_acesso)}
                </div>
                <div className="text-sm text-muted-foreground">Último acesso</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatDate(usuario.created_at)}
                </div>
                <div className="text-sm text-muted-foreground">Criado em</div>
              </div>
            </div>

            {usuario.updated_at !== usuario.created_at && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {formatDate(usuario.updated_at)}
                  </div>
                  <div className="text-sm text-muted-foreground">Última atualização</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}