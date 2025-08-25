import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Upload, X, User, Building2 } from 'lucide-react'
import { uploadService } from '@/services/uploadService'
import { useToast } from '@/hooks/use-toast'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageChange: (imageUrl: string | null) => void
  uploadType: 'user' | 'company'
  entityId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  uploadType, 
  entityId,
  size = 'md',
  className = '' 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = uploadService.validateImageFile(file)
    if (!validation.isValid) {
      toast({
        title: 'Erro',
        description: validation.error,
        variant: 'destructive'
      })
      return
    }

    setPreview(URL.createObjectURL(file))
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      let result
      if (uploadType === 'user') {
        result = await uploadService.uploadUserAvatar(file, entityId)
        await uploadService.updateUserPhoto(entityId, result.url)
      } else {
        result = await uploadService.uploadCompanyLogo(file, entityId)
        await uploadService.updateCompanyLogo(entityId, result.url)
      }

      onImageChange(result.url)
      toast({
        title: 'Sucesso',
        description: `${uploadType === 'user' ? 'Foto' : 'Logo'} atualizada com sucesso!`
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      })
      setPreview(currentImageUrl || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    try {
      if (uploadType === 'user') {
        await uploadService.updateUserPhoto(entityId, '')
      } else {
        await uploadService.updateCompanyLogo(entityId, '')
      }
      
      setPreview(null)
      onImageChange(null)
      toast({
        title: 'Sucesso',
        description: `${uploadType === 'user' ? 'Foto' : 'Logo'} removida com sucesso!`
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover imagem',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="relative group">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={preview || undefined} alt="Imagem" />
          <AvatarFallback>
            {uploadType === 'user' ? (
              <User className="w-1/2 h-1/2" />
            ) : (
              <Building2 className="w-1/2 h-1/2" />
            )}
          </AvatarFallback>
        </Avatar>
        
        {preview && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="min-w-[120px]"
        >
          {isUploading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span>Enviando...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>
                {preview ? 'Alterar' : 'Adicionar'} {uploadType === 'user' ? 'Foto' : 'Logo'}
              </span>
            </div>
          )}
        </Button>

        <Label className="text-xs text-muted-foreground text-center">
          JPEG, PNG ou WebP • Máx. 5MB
        </Label>
      </div>
    </div>
  )
}