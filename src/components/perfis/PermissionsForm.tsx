import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  MODULOS_SISTEMA, 
  PERMISSION_LABELS, 
  PerfilFormData,
  ModuloSistema,
  TipoPermissao 
} from '@/types/perfil'

interface PermissionsFormProps {
  form: UseFormReturn<PerfilFormData>
}

export function PermissionsForm({ form }: PermissionsFormProps) {
  const permissoes = form.watch('permissoes')

  const togglePermission = (modulo: ModuloSistema, permission: TipoPermissao, value: boolean) => {
    const currentPermissions = form.getValues('permissoes')
    const modulePermissions = currentPermissions[modulo] || {}
    
    form.setValue(`permissoes.${modulo}`, {
      ...modulePermissions,
      [permission]: value
    })
  }

  const toggleAllModulePermissions = (modulo: ModuloSistema, enabled: boolean) => {
    const moduleConfig = MODULOS_SISTEMA[modulo]
    if (!moduleConfig || !moduleConfig.permissions) {
      console.error(`Configuração do módulo '${modulo}' não encontrada`)
      return
    }
    
    const modulePermissions: Record<string, boolean> = {}
    
    moduleConfig.permissions.forEach(permission => {
      modulePermissions[permission] = enabled
    })
    
    form.setValue(`permissoes.${modulo}`, modulePermissions)
  }

  const isModuleFullyEnabled = (modulo: ModuloSistema) => {
    const modulePermissions = permissoes[modulo] || {}
    const moduleConfig = MODULOS_SISTEMA[modulo]
    
    if (!moduleConfig || !moduleConfig.permissions) {
      console.error(`Configuração do módulo '${modulo}' não encontrada`)
      return false
    }
    
    return moduleConfig.permissions.every(permission => 
      modulePermissions[permission] === true
    )
  }

  const hasAnyModulePermission = (modulo: ModuloSistema) => {
    const modulePermissions = permissoes[modulo] || {}
    const moduleConfig = MODULOS_SISTEMA[modulo]
    
    if (!moduleConfig || !moduleConfig.permissions) {
      console.error(`Configuração do módulo '${modulo}' não encontrada`)
      return false
    }
    
    return moduleConfig.permissions.some(permission => 
      modulePermissions[permission] === true
    )
  }

  const getModuleStatusBadge = (modulo: ModuloSistema) => {
    if (isModuleFullyEnabled(modulo)) {
      return <Badge variant="default" className="ml-2">Completo</Badge>
    } else if (hasAnyModulePermission(modulo)) {
      return <Badge variant="secondary" className="ml-2">Parcial</Badge>
    }
    return <Badge variant="outline" className="ml-2">Desabilitado</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Permissões do Perfil</h3>
        <p className="text-sm text-muted-foreground">
          Configure as permissões que este perfil terá no sistema.
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(MODULOS_SISTEMA).map(([moduloKey, moduleConfig]) => {
          const modulo = moduloKey as ModuloSistema
          const modulePermissions = permissoes[modulo] || {}

          // Verificação de segurança para moduleConfig
          if (!moduleConfig || !moduleConfig.permissions || !moduleConfig.label) {
            console.error(`Configuração inválida para o módulo '${modulo}'`)
            return null
          }

          return (
            <Card key={modulo} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CardTitle className="text-base">{moduleConfig.label}</CardTitle>
                    {getModuleStatusBadge(modulo)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Habilitar Tudo</label>
                    <Switch
                      checked={isModuleFullyEnabled(modulo)}
                      onCheckedChange={(checked) => toggleAllModulePermissions(modulo, checked)}
                    />
                  </div>
                </div>
                <CardDescription>{moduleConfig.description || 'Descrição não disponível'}</CardDescription>
              </CardHeader>
              
              <Separator />
              
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {moduleConfig.permissions.map((permission) => {
                    const permissionKey = permission as TipoPermissao
                    const isEnabled = modulePermissions[permissionKey] || false

                    return (
                      <FormField
                        key={`${modulo}.${permission}`}
                        control={form.control}
                        name={`permissoes.${modulo}.${permission}` as any}
                        render={() => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => 
                                  togglePermission(modulo, permissionKey, checked)
                                }
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {PERMISSION_LABELS[permissionKey] || permission}
                            </FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Resumo das Permissões</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MODULOS_SISTEMA).map(([moduloKey, moduleConfig]) => {
            const modulo = moduloKey as ModuloSistema
            
            // Verificação de segurança para moduleConfig
            if (!moduleConfig || !moduleConfig.label) {
              console.error(`Configuração inválida para o módulo '${modulo}' no resumo`)
              return null
            }
            
            if (!hasAnyModulePermission(modulo)) return null

            return (
              <Badge key={modulo} variant="secondary">
                {moduleConfig.label}
              </Badge>
            )
          })}
        </div>
        {Object.keys(permissoes).every(modulo => 
          !hasAnyModulePermission(modulo as ModuloSistema)
        ) && (
          <p className="text-sm text-muted-foreground">
            Nenhuma permissão selecionada
          </p>
        )}
      </div>
    </div>
  )
}