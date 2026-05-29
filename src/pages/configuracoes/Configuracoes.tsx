import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/ui/image-upload'
import { Building2, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { companyService } from '@/services/companyService'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/types/database'

type Empresa = Tables<'empresas'>

const ConfiguracoesPage = () => {
  const { toast } = useToast()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
  })

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      // Buscar empresa emitente (a que aparece nas emissões)
      let { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('emitente', true)
        .limit(1)
        .maybeSingle()

      // Fallback: primeira empresa ativa
      if (!data) {
        const res = await supabase
          .from('empresas')
          .select('*')
          .eq('ativo', true)
          .limit(1)
          .maybeSingle()
        data = res.data
      }

      if (data) {
        setEmpresa(data)
        setForm({
          nome: data.nome || '',
          cnpj: data.cnpj || '',
          telefone: data.telefone || '',
          email: data.email || '',
          endereco: data.endereco || '',
        })
      }
      setLoading(false)
    }
    carregar()
  }, [])

  const handleSave = async () => {
    if (!empresa) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          nome: form.nome,
          cnpj: form.cnpj || null,
          telefone: form.telefone || null,
          email: form.email || null,
          endereco: form.endereco || null,
        })
        .eq('id', empresa.id)

      if (error) throw error

      companyService.clearCache()
      toast({ title: 'Sucesso', description: 'Dados da empresa atualizados.' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao salvar dados da empresa',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = (url: string | null) => {
    if (empresa) setEmpresa({ ...empresa, logo_url: url })
    companyService.clearCache() // emissões passam a usar o novo logo
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema.</p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList>
          <TabsTrigger value="empresa">
            <Building2 className="h-4 w-4 mr-2" />
            Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Empresa</CardTitle>
              <CardDescription>
                Dados e logo da empresa emitente. O logo aparece no canto superior esquerdo das
                emissões (romaneios de entrada/saída, requisição de compra, fichas de EPI, etc).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Carregando...
                </div>
              ) : !empresa ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma empresa emitente encontrada.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Logo */}
                  <div className="flex flex-col items-center gap-2">
                    <Label>Logo da Empresa</Label>
                    <ImageUpload
                      currentImageUrl={empresa.logo_url || undefined}
                      onImageChange={handleLogoChange}
                      uploadType="company"
                      entityId={empresa.id}
                      size="lg"
                    />
                  </div>

                  {/* Dados */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="nome">Nome *</Label>
                        <Input
                          id="nome"
                          value={form.nome}
                          onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          value={form.cnpj}
                          onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={form.telefone}
                          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="endereco">Endereço</Label>
                        <Input
                          id="endereco"
                          value={form.endereco}
                          onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ConfiguracoesPage
