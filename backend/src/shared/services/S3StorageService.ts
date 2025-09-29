import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3PathGenerator, S3PathOptions } from '../utils/s3PathGenerator';
import crypto from 'crypto';

export interface S3UploadOptions {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  modulo: string;
  categoria: string;
  entidadeId: string;
  metadata?: Record<string, string>;
}

export interface S3UploadResult {
  s3Key: string;
  url: string;
  size: number;
  hash: string;
  mimetype: string;
}

export interface PresignedUrlOptions {
  s3Key: string;
  expiresIn?: number; // segundos, padrão 3600 (1 hora)
  operation: 'upload' | 'download';
}

export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  private sanitizeFilename(filename: string): string {
    // Remove/substitui caracteres especiais que causam problemas em headers HTTP
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f\x80-\x9f]/g, '_') // Caracteres problemáticos
      .replace(/[\u0080-\uFFFF]/g, (match) => { // Caracteres não-ASCII
        // Mantém apenas caracteres básicos ou substitui por underscore
        return match.charCodeAt(0) > 127 ? '_' : match;
      })
      .replace(/_{2,}/g, '_') // Remove múltiplos underscores consecutivos
      .trim()
      .substring(0, 255); // Limita tamanho máximo
  }

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const endpoint = process.env.AWS_S3_ENDPOINT;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials não configuradas');
    }

    this.bucketName = process.env.AWS_S3_BUCKET || 'probotec-clinica-files';

    // Configuração do cliente S3
    const clientConfig: any = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    // Se tiver endpoint customizado (ex: MinIO local), adicionar
    if (endpoint && endpoint !== 'https://s3.amazonaws.com') {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * Upload de arquivo para S3
   */
  async uploadFile(options: S3UploadOptions): Promise<S3UploadResult> {
    // Gerar path estruturado
    const s3Key = S3PathGenerator.generatePath({
      modulo: options.modulo,
      categoria: options.categoria,
      entidadeId: options.entidadeId,
      filename: options.filename
    });

    // Calcular hash MD5 do arquivo
    const hash = crypto.createHash('md5').update(options.buffer).digest('hex');

    // Preparar metadata
    const metadata = {
      'original-filename': this.sanitizeFilename(options.filename),
      'upload-timestamp': new Date().toISOString(),
      'file-hash': hash,
      'modulo': options.modulo,
      'categoria': options.categoria,
      'entidade-id': options.entidadeId,
      ...options.metadata
    };

    try {
      // Comando de upload
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: options.buffer,
        ContentType: options.mimetype,
        Metadata: metadata,
        ServerSideEncryption: 'AES256' // Criptografia server-side
      });

      await this.s3Client.send(command);

      // Gerar URL pública (se bucket for público) ou presignada
      const url = await this.generatePresignedUrl({
        s3Key,
        operation: 'download',
        expiresIn: 7 * 24 * 3600 // 7 dias (máximo permitido pelo AWS)
      });

      return {
        s3Key,
        url,
        size: options.buffer.length,
        hash,
        mimetype: options.mimetype
      };
    } catch (error) {
      console.error('Erro no upload S3:', error);
      throw new Error(`Falha no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Gerar URL presignada para upload ou download
   */
  async generatePresignedUrl(options: PresignedUrlOptions): Promise<string> {
    const expiresIn = options.expiresIn || 3600; // 1 hora padrão

    try {
      if (options.operation === 'upload') {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: options.s3Key,
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn });
      } else {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: options.s3Key,
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn });
      }
    } catch (error) {
      console.error('Erro ao gerar URL presignada:', error);
      throw new Error(`Falha ao gerar URL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Download de arquivo do S3
   */
  async downloadFile(s3Key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Arquivo não encontrado');
      }

      // Converter stream para buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Erro no download S3:', error);
      throw new Error(`Falha no download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Deletar arquivo do S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Erro ao deletar arquivo S3:', error);
      throw new Error(`Falha ao deletar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Verificar se arquivo existe
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Copiar arquivo (para versionamento)
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Erro ao copiar arquivo S3:', error);
      throw new Error(`Falha ao copiar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Listar arquivos por prefixo
   */
  async listFiles(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);
      return response.Contents?.map(item => item.Key!).filter(Boolean) || [];
    } catch (error) {
      console.error('Erro ao listar arquivos S3:', error);
      throw new Error(`Falha ao listar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obter metadados do arquivo
   */
  async getFileMetadata(s3Key: string): Promise<Record<string, string> | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);
      return response.Metadata || null;
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Criar versão do arquivo
   */
  async createVersion(s3Key: string, version: number): Promise<string> {
    const versionKey = S3PathGenerator.generateVersionPath(s3Key, version);
    await this.copyFile(s3Key, versionKey);
    return versionKey;
  }

  /**
   * Mover arquivo para pasta de backup
   */
  async moveToBackup(s3Key: string): Promise<string> {
    const backupKey = S3PathGenerator.generateBackupPath(s3Key);
    await this.copyFile(s3Key, backupKey);
    await this.deleteFile(s3Key);
    return backupKey;
  }
}