import { supabase } from '@/lib/supabase'

export interface UploadResult {
  url: string
  path: string
}

export const uploadService = {
  async uploadUserAvatar(file: File, userId: string): Promise<UploadResult> {
    const fileExt = file.name.split('.').pop()
    const fileName = `users/${userId}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      })

    if (error) {
      throw new Error(`Erro ao fazer upload da foto: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path)

    return {
      url: urlData.publicUrl,
      path: data.path
    }
  },

  async uploadCompanyLogo(file: File, companyId: string): Promise<UploadResult> {
    const fileExt = file.name.split('.').pop()
    const fileName = `companies/${companyId}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      })

    if (error) {
      throw new Error(`Erro ao fazer upload do logo: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path)

    return {
      url: urlData.publicUrl,
      path: data.path
    }
  },

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([path])

    if (error) {
      throw new Error(`Erro ao deletar arquivo: ${error.message}`)
    }
  },

  validateImageFile(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.'
      }
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Arquivo muito grande. Tamanho máximo: 5MB.'
      }
    }

    return { isValid: true }
  },

  async updateUserPhoto(userId: string, photoUrl: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ foto_url: photoUrl })
      .eq('id', userId)

    if (error) {
      throw new Error(`Erro ao atualizar foto do usuário: ${error.message}`)
    }
  },

  async updateCompanyLogo(companyId: string, logoUrl: string): Promise<void> {
    const { error } = await supabase
      .from('empresas')
      .update({ logo_url: logoUrl })
      .eq('id', companyId)

    if (error) {
      throw new Error(`Erro ao atualizar logo da empresa: ${error.message}`)
    }
  }
}