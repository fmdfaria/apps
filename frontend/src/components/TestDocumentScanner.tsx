import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentScannerFixed } from '@/components/ui/DocumentScannerFixed';

export const TestDocumentScanner: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);

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
    
    console.log('PDF salvo:', fileName, 'Tamanho:', pdfBlob.size, 'bytes');
    setShowScanner(false);
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teste do Document Scanner</h1>
      
      <p className="text-gray-600 mb-6">
        Clique no botão abaixo para testar a funcionalidade de scanner de documentos
        similar ao Adobe Scan.
      </p>
      
      <Button
        onClick={() => setShowScanner(true)}
        className="w-full"
      >
        🔍 Abrir Document Scanner
      </Button>
      
      <DocumentScannerFixed
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSavePDF={handleSavePDF}
      />
    </div>
  );
};