# Document Scanner - Funcionalidade Adobe Scan

## Visão Geral

A funcionalidade de Document Scanner foi implementada para permitir a digitalização de documentos através da câmera do dispositivo, similar ao aplicativo Adobe Scan. A solução identifica automaticamente as bordas de documentos, permite ajustes manuais e converte a imagem capturada em PDF de alta qualidade.

## Componentes Implementados

### 1. DocumentScanner.tsx

Componente principal que implementa toda a funcionalidade de scanner:

**Características:**
- Detecção automática de bordas usando OpenCV.js
- Interface para ajuste manual dos cantos do documento
- Filtros de imagem (brilho, contraste, escala de cinza, inversão)
- Correção de perspectiva
- Geração de PDF de alta qualidade
- Interface responsiva e intuitiva

**Props:**
```typescript
interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePDF: (pdfBlob: Blob, fileName: string) => void;
}
```

### 2. FileUpload.tsx (Atualizado)

O componente FileUpload foi atualizado para incluir um botão "Digitalizar Documento" que abre o DocumentScanner.

**Nova funcionalidade:**
- Botão "Digitalizar Documento" com ícone de scanner
- Integração automática com o DocumentScanner
- Conversão automática do PDF gerado para File e adição à lista

## Tecnologias Utilizadas

### OpenCV.js
- **Versão:** 1.2.1
- **Uso:** Detecção de contornos, correção de perspectiva e filtros de imagem
- **Carregamento:** Dinâmico via CDN para otimizar o bundle

### jsPDF
- **Versão:** 3.0.1  
- **Uso:** Geração de PDFs de alta qualidade
- **Configuração:** Formato A4, orientação portrait

## Funcionalidades Implementadas

### ✅ 1. Captura via Câmera
- Acesso à câmera traseira do dispositivo
- Resolução otimizada (1920x1080)
- Interface fullscreen para melhor experiência

### ✅ 2. Detecção Automática de Bordas
- Algoritmo de detecção usando OpenCV.js:
  - Conversão para escala de cinza
  - Desfoque gaussiano para reduzir ruído
  - Threshold adaptativo
  - Detecção de contornos
  - Aproximação poligonal para encontrar retângulos
  - Seleção do maior contorno com 4 vértices

### ✅ 3. Ajuste Manual de Cantos
- 4 pontos de controle arrastavéis
- Visualização em tempo real das modificações
- Interface intuitiva com pontos vermelhos destacados
- Linhas conectoras verdes para visualizar a área selecionada

### ✅ 4. Filtros de Imagem
- **Brilho:** Ajuste de -100 a +100
- **Contraste:** Ajuste de -100 a +100
- **Escala de cinza:** Conversão para preto e branco
- **Inversão:** Inverter cores (útil para documentos com fundo escuro)
- **Reset:** Botão para restaurar valores padrão

### ✅ 5. Correção de Perspectiva
- Transformação automática usando matriz de perspectiva
- Conversão para formato A4 padrão (210x297 pixels em escala 4x)
- Resultado final com perspectiva corrigida

### ✅ 6. Geração de PDF
- Formato A4 padrão
- Qualidade de imagem otimizada (JPEG, qualidade 0.9)
- Nome automático com data atual
- Retorno como Blob para integração com upload

## Como Usar

### Integração Básica

```typescript
import { DocumentScanner } from '@/components/ui/DocumentScanner';

function MyComponent() {
  const [showScanner, setShowScanner] = useState(false);

  const handleSavePDF = (pdfBlob: Blob, fileName: string) => {
    // Processar o PDF gerado
    console.log('PDF gerado:', fileName, pdfBlob.size, 'bytes');
  };

  return (
    <>
      <button onClick={() => setShowScanner(true)}>
        Abrir Scanner
      </button>
      
      <DocumentScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSavePDF={handleSavePDF}
      />
    </>
  );
}
```

### Integração com FileUpload

O DocumentScanner já está integrado ao componente FileUpload existente. Basta usar o FileUpload normalmente que o botão "Digitalizar Documento" estará disponível automaticamente.

### Teste da Funcionalidade

Acesse a rota `/test/scanner` para testar a funcionalidade independentemente.

## Fluxo de Funcionamento

1. **Inicialização:** Carregamento do OpenCV.js e inicialização da câmera
2. **Captura:** Usuário captura imagem através da câmera
3. **Detecção:** Sistema detecta automaticamente as bordas do documento
4. **Ajuste:** Usuário pode ajustar manualmente os cantos (opcional)
5. **Filtros:** Aplicação de filtros para melhorar a qualidade (opcional)
6. **Processamento:** Correção de perspectiva e aplicação de filtros
7. **Geração:** Criação do PDF final
8. **Callback:** Retorno do PDF via callback `onSavePDF`

## Requisitos do Sistema

### Navegador
- Suporte a WebRTC (getUserMedia)
- Suporte a Canvas API
- JavaScript ES2020+

### Dispositivo
- Câmera traseira recomendada
- Boa iluminação para melhor detecção
- Resolução mínima recomendada: 720p

## Otimizações Implementadas

### Performance
- Carregamento assíncrono do OpenCV.js
- Cleanup automático de objetos OpenCV para evitar vazamentos de memória
- Redimensionamento otimizado para processamento

### UX/UI
- Interface responsiva para diferentes tamanhos de tela
- Feedback visual durante processamento
- Estados de loading apropriados
- Controles intuitivos com ícones descritivos

### Qualidade
- Múltiplos filtros para diferentes tipos de documento
- Correção de perspectiva precisa
- Geração de PDF em alta qualidade

## Limitações Conhecidas

1. **Dependência de OpenCV.js:** Requer carregamento de biblioteca externa (~8MB)
2. **Detecção automática:** Pode falhar em documentos com bordas pouco definidas
3. **Iluminação:** Requer boa iluminação para melhor resultado
4. **Compatibilidade:** Funciona apenas em navegadores com suporte a WebRTC

## Próximas Melhorias Sugeridas

- [ ] Suporte a múltiplas páginas em um único PDF
- [ ] Detecção de texto OCR (opcional)
- [ ] Mais opções de formato de saída (PNG, JPEG)
- [ ] Templates pré-definidos para diferentes tipos de documento
- [ ] Modo offline com service workers
- [ ] Compressão adaptativa baseada no conteúdo

## Troubleshooting

### Câmera não funciona
- Verificar permissões do navegador
- Garantir acesso HTTPS (necessário para getUserMedia)
- Testar em diferentes navegadores

### Detecção de bordas falha
- Melhorar iluminação do ambiente
- Ajustar manualmente os cantos
- Usar superfície com contraste adequado

### PDF não é gerado
- Verificar console para erros do OpenCV.js
- Garantir que os 4 cantos estão definidos
- Verificar se o OpenCV.js foi carregado completamente