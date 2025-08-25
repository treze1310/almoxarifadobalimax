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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PerfilAcesso, MODULOS_SISTEMA, PERMISSION_LABELS, ModuloSistema, TipoPermissao } from '@/types/perfil'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Shield, Calendar, User, CheckCircle, XCircle } from 'lucide-react'

interface PerfilDetailsDialogProps {
  perfil: PerfilAcesso | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PerfilDetailsDialog({ 
  perfil, 
  open, 
  onOpenChange 
}: PerfilDetailsDialogProps) {
  if (!perfil) return null

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

  const formatRelativeDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return 'Data inválida'
    }
  }

  const getModulePermissions = (modulo: ModuloSistema) => {
    const modulePermissions = perfil.permissoes[modulo] || {}
    const moduleConfig = MODULOS_SISTEMA[modulo]
    
    if (!moduleConfig || !moduleConfig.permissions) {
      console.error(`Configuração do módulo '${modulo}' não encontrada`)
      return []
    }
    
    return moduleConfig.permissions
      .filter(permission => modulePermissions[permission] === true)
      .map(permission => PERMISSION_LABELS[permission as TipoPermissao] || permission)
  }

  const hasAnyPermissions = () => {
    return Object.entries(MODULOS_SISTEMA).some(([moduloKey, moduleConfig]) => {
      const modulo = moduloKey as ModuloSistema
      const modulePermissions = perfil.permissoes[modulo] || {}
      
      if (!moduleConfig || !moduleConfig.permissions) {
        console.error(`Configuração do módulo '${modulo}' não encontrada`)
        return false
      }
      
      return moduleConfig.permissions.some(permission => 
        modulePermissions[permission] === true
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Detalhes do Perfil
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre o perfil de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{perfil.nome}</div>
                <div className="text-sm text-muted-foreground">Nome do perfil</div>
              </div>
            </div>

            {perfil.descricao && (
              <div>
                <div className="font-medium mb-1">Descrição</div>
                <div className="text-sm text-muted-foreground">{perfil.descricao}</div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={perfil.ativo ? 'default' : 'secondary'}>
                {perfil.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tipo</span>
              <Badge variant={perfil.sistema ? 'destructive' : 'outline'}>
                {perfil.sistema ? 'Sistema' : 'Personalizado'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Permissões */}
          <div className="space-y-4">
            <h3 className="font-medium">Permissões</h3>
            
            {hasAnyPermissions() ? (
              <div className="space-y-3">
                {Object.entries(MODULOS_SISTEMA).map(([moduloKey, moduleConfig]) => {
                  const modulo = moduloKey as ModuloSistema
                  const permissions = getModulePermissions(modulo)
                  
                  // Verificação de segurança para moduleConfig
                  if (!moduleConfig || !moduleConfig.label) {
                    console.error(`Configuração inválida para o módulo '${modulo}'`)
                    return null
                  }
                  
                  if (permissions.length === 0) return null

                  return (
                    <Card key={modulo}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{moduleConfig.label}</CardTitle>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <CardDescription className="text-xs">
                          {moduleConfig.description || 'Descrição não disponível'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {permissions.map((permission, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Nenhuma permissão configurada
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Informações de auditoria */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatDate(perfil.created_at)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Criado {formatRelativeDate(perfil.created_at)}
                </div>
              </div>
            </div>

            {perfil.updated_at !== perfil.created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {formatDate(perfil.updated_at)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Última atualização {formatRelativeDate(perfil.updated_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}