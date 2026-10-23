import { useState } from 'react'
import { Check, ChevronsUpDown, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useSupabaseTable } from '@/hooks/useSupabase'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { LocalizacaoForm } from '@/components/localizacao/LocalizacaoForm'
import { useCenteredDialog } from '@/hooks/useCenteredDialog'
import type { Tables } from '@/types/database'
import type { LocalizacaoFormData } from '@/lib/validations'

/**
 * Seleção de localização com cadastro e edição no próprio formulário do item.
 *
 * As 24 localizações vieram do sistema anterior e os endereços mudaram: era
 * preciso sair do cadastro do material, ir até Localização, corrigir, voltar e
 * começar de novo. Aqui dá para criar e corrigir sem perder o que já foi
 * digitado no item.
 */

interface LocalizacaoComboboxWithAddProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function LocalizacaoComboboxWithAdd({
  value,
  onValueChange,
  placeholder = 'Sem localização',
  disabled = false,
}: LocalizacaoComboboxWithAddProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Tables<'localizacao'> | null>(null)
  const { data: localizacoes, fetchData: recarregar } = useSupabaseTable('localizacao', {
    order: { column: 'nome' },
  })
  const { toast } = useToast()

  const posicaoDialogo = useCenteredDialog(criando || !!editando)

  const ativas = (localizacoes ?? [])
    .filter((l) => l.ativo || l.id === value)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true })
      || a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
  const termo = busca.toLowerCase()
  const filtradas = ativas.filter(
    (l) =>
      l.nome.toLowerCase().includes(termo) ||
      l.codigo.toLowerCase().includes(termo) ||
      (l.descricao ?? '').toLowerCase().includes(termo),
  )
  const selecionada = ativas.find((l) => l.id === value)

  const criar = async (dados: LocalizacaoFormData) => {
    try {
      const { data: nova, error } = await supabase
        .from('localizacao')
        .insert([dados])
        .select()
        .single()

      if (error) throw error

      await recarregar()
      // Já deixa selecionada: foi criada para este item
      onValueChange(nova.id)
      setCriando(false)
      setOpen(false)
      toast({ title: 'Localização criada', description: `${nova.codigo} - ${nova.nome}` })
    } catch (erro) {
      toast({
        title: 'Erro ao criar localização',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    }
  }

  const salvarEdicao = async (dados: LocalizacaoFormData) => {
    if (!editando) return
    try {
      const { error } = await supabase.from('localizacao').update(dados).eq('id', editando.id)
      if (error) throw error

      await recarregar()
      setEditando(null)
      setOpen(false)
      toast({
        title: 'Localização atualizada',
        description: 'A mudança vale para todos os itens guardados nela.',
      })
    } catch (erro) {
      toast({
        title: 'Erro ao salvar localização',
        description: erro instanceof Error ? erro.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Localização"
              aria-expanded={open}
              className="w-full justify-between font-normal"
              disabled={disabled}
            >
              <span className="truncate">
                {selecionada ? `${selecionada.codigo} - ${selecionada.nome}` : placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10060]" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Buscar por código ou nome..."
                value={busca}
                onValueChange={setBusca}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 p-4">
                    <p className="text-sm text-muted-foreground">Nenhuma localização encontrada.</p>
                    <Button variant="outline" size="sm" onClick={() => { setCriando(true); setOpen(false) }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar localização
                    </Button>
                  </div>
                </CommandEmpty>

                <CommandGroup>
                  <CommandItem
                    onSelect={() => { setCriando(true); setOpen(false) }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium text-primary">Criar nova localização</span>
                  </CommandItem>

                  {/* Item sem localização é caso normal (ainda não guardado,
                      em trânsito): escolher uma não pode ser irreversível */}
                  <CommandItem
                      onSelect={() => { onValueChange(''); setOpen(false) }}
                      className="flex items-center gap-2 border-b"
                    >
                      <Check className={cn('h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                      <span className="text-muted-foreground">Sem localização</span>
                  </CommandItem>

                  {filtradas.map((localizacao) => (
                    <CommandItem
                      key={localizacao.id}
                      value={localizacao.id}
                      onSelect={() => { onValueChange(localizacao.id); setOpen(false) }}
                      className="group"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          value === localizacao.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">
                          <span className="font-medium">{localizacao.codigo}</span> —{' '}
                          {localizacao.nome}
                        </div>
                        {localizacao.descricao && (
                          <div className="truncate text-xs text-muted-foreground">
                            {localizacao.descricao}
                          </div>
                        )}
                      </div>
                      {/* Corrigir o endereço sem sair do cadastro do item */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditando(localizacao)
                          setOpen(false)
                        }}
                        className="ml-2 rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Editar ${localizacao.codigo}`}
                        title="Editar esta localização"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

      </div>

      <Dialog
        open={criando || !!editando}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setCriando(false)
            setEditando(null)
          }
        }}
      >
        <DialogContent
          overlayClassName="z-[10070]"
          className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto items-start fixed z-[10080]"
          style={{
            top: posicaoDialogo.top,
            left: posicaoDialogo.left,
            transform: posicaoDialogo.transform,
          }}
        >
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar localização' : 'Nova localização'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'A mudança vale para todos os itens guardados nesta localização.'
                : 'Cadastre o endereço e ele já fica selecionado neste item.'}
            </DialogDescription>
          </DialogHeader>
          <LocalizacaoForm
            initialData={editando ?? undefined}
            onSubmit={editando ? salvarEdicao : criar}
            onCancel={() => {
              setCriando(false)
              setEditando(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
