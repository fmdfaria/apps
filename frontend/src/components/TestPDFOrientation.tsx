import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentScannerFixed } from '@/components/ui/DocumentScannerFixed';

export const TestPDFOrientation: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [lastPdfInfo, setLastPdfInfo] = useState<{name: string, size: number} | null>(null);

  const handleSavePDF = (pdfBlob: Blob, fileName: string) => {
    // Criar um link para download do PDF
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setLastPdfInfo({
      name: fileName,
      size: Math.round(pdfBlob.size / 1024) // KB
    });
    
    console.log('PDF salvo:', fileName, 'Tamanho:', pdfBlob.size, 'bytes');
    setShowScanner(false);
  };

  const getCurrentOrientation = () => {
    return window.innerWidth > window.innerHeight ? 'horizontal' : 'vertical';
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🔄 Teste de Orientação PDF</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">📱 Status da Tela</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Dimensões:</strong> {window.innerWidth} × {window.innerHeight}px
          </div>
          <div>
            <strong>Orientação:</strong> {getCurrentOrientation()} 
            {getCurrentOrientation() === 'horizontal' ? ' 📱↔️' : ' 📱↕️'}
          </div>
          <div>
            <strong>Razão:</strong> {(window.innerWidth / window.innerHeight).toFixed(2)}
          </div>
          <div>
            <strong>PDF Auto:</strong> {getCurrentOrientation() === 'horizontal' ? 'Landscape' : 'Portrait'}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">🎯 Como Testar</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Clique no botão abaixo para abrir o scanner</li>
          <li>Capture um documento com a câmera</li>
          <li>Ajuste os pontos se necessário</li>
          <li>Escolha a orientação do PDF:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><strong>Automático:</strong> Usa orientação da tela atual</li>
              <li><strong>Vertical:</strong> PDF em formato portrait (A4 normal)</li>
              <li><strong>Horizontal:</strong> PDF em formato landscape (A4 deitado)</li>
            </ul>
          </li>
          <li>Gere o PDF e veja o resultado</li>
        </ol>
      </div>
      
      <div className="text-center mb-6">
        <Button
          onClick={() => setShowScanner(true)}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg py-6"
        >
          🔍 Abrir Scanner com Controle de Orientação
        </Button>
      </div>

      {lastPdfInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✅ Último PDF Gerado</h3>
          <div className="text-sm text-green-700">
            <p><strong>Arquivo:</strong> {lastPdfInfo.name}</p>
            <p><strong>Tamanho:</strong> {lastPdfInfo.size} KB</p>
            <p><strong>Orientação:</strong> {lastPdfInfo.name.includes('landscape') ? '📄 Horizontal (Landscape)' : '📄 Vertical (Portrait)'}</p>
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p><strong>Dica:</strong> Rode o dispositivo ou redimensione a janela para ver como a detecção automática funciona!</p>
      </div>
      
      <DocumentScannerFixed
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSavePDF={handleSavePDF}
      />
    </div>
  );
};