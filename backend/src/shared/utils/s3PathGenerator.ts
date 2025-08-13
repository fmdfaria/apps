/**
 * Utilitário para gerar paths estruturados no S3
 * Estrutura: {modulo}/{ano}/{mes}/{categoria}/{entidadeId}/{filename}
 */

export interface S3PathOptions {
  modulo: string; // 'pacientes', 'profissionais', 'contratos', etc.
  categoria: string; // 'documentos', 'exames', 'comprovantes', etc.
  entidadeId: string; // UUID da entidade
  filename: string; // Nome do arquivo
  date?: Date; // Data para particionamento (padrão: agora)
}

export class S3PathGenerator {
  /**
   * Gera o path completo do arquivo no S3
   */
  static generatePath(options: S3PathOptions): string {
    const date = options.date || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Sanitizar filename para evitar caracteres especiais
    const sanitizedFilename = this.sanitizeFilename(options.filename);
    
    return `${options.modulo}/${year}/${month}/${options.categoria}/${options.entidadeId}/${sanitizedFilename}`;
  }

  /**
   * Gera um path temporário para uploads
   */
  static generateTempPath(filename: string, uploadId?: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const timestamp = Date.now();
    const id = uploadId || timestamp;
    
    return `temp/uploads/${id}/${sanitizedFilename}`;
  }

  /**
   * Gera path para backup
   */
  static generateBackupPath(originalPath: string, date?: Date): string {
    const backupDate = date || new Date();
    const year = backupDate.getFullYear();
    const month = String(backupDate.getMonth() + 1).padStart(2, '0');
    const day = String(backupDate.getDate()).padStart(2, '0');
    
    return `backups/${year}/${month}/${day}/${originalPath}`;
  }

  /**
   * Gera path para versões do arquivo
   */
  static generateVersionPath(originalPath: string, version: number): string {
    const pathParts = originalPath.split('/');
    const filename = pathParts.pop();
    const directory = pathParts.join('/');
    
    if (!filename) {
      throw new Error('Invalid original path');
    }

    const [name, ...extensions] = filename.split('.');
    const extension = extensions.join('.');
    const versionedFilename = `${name}_v${version}.${extension}`;
    
    return `${directory}/versions/${versionedFilename}`;
  }

  /**
   * Sanitiza o nome do arquivo removendo caracteres especiais
   */
  private static sanitizeFilename(filename: string): string {
    // Remove caracteres especiais e substitui espaços por underscores
    return filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais
      .replace(/_{2,}/g, '_') // Remove múltiplos underscores consecutivos
      .toLowerCase();
  }

  /**
   * Extrai informações do path do S3
   */
  static parseS3Path(s3Key: string): {
    modulo: string;
    year: string;
    month: string;
    categoria: string;
    entidadeId: string;
    filename: string;
  } | null {
    const parts = s3Key.split('/');
    
    // Estrutura esperada: modulo/year/month/categoria/entidadeId/filename
    if (parts.length !== 6) {
      return null;
    }

    return {
      modulo: parts[0],
      year: parts[1],
      month: parts[2],
      categoria: parts[3],
      entidadeId: parts[4],
      filename: parts[5]
    };
  }

  /**
   * Valida se o path segue o padrão esperado
   */
  static isValidPath(s3Key: string): boolean {
    return this.parseS3Path(s3Key) !== null;
  }
}

/**
 * Enum com módulos disponíveis
 */
export enum S3Modules {
  PACIENTES = 'pacientes',
  PROFISSIONAIS = 'profissionais',
  CONTRATOS = 'contratos',
  ADENDOS = 'adendos',
  USUARIOS = 'usuarios',
  SISTEMA = 'sistema'
}

/**
 * Enum com categorias disponíveis
 */
export enum S3Categories {
  DOCUMENTOS = 'documentos',
  EXAMES = 'exames',
  FOTOS = 'fotos',
  COMPROVANTES = 'comprovantes',
  CONTRATOS = 'contratos',
  LAUDOS = 'laudos',
  RECEITAS = 'receitas',
  OUTROS = 'outros'
}