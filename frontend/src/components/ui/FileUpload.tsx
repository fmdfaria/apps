
import { useState, useRef } from 'react';
import { Upload, X, File, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentScannerFixed } from '@/components/ui/DocumentScannerFixed';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  acceptedTypes?: string;
  maxFiles?: number;
  label?: string;
  enableScanner?: boolean;
}

export const FileUpload = ({ 
  files, 
  onFilesChange, 
  acceptedTypes = '.pdf,.jpg,.jpeg,.png',
  maxFiles = 5,
  label = 'Arquivos',
  enableScanner = true
}: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (newFiles: FileList) => {
    const fileArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);
    
    onFilesChange([...files, ...filesToAdd]);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleScannerPDF = (pdfBlob: Blob, fileName: string) => {
    // Converter Blob para File
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    // Adicionar arquivo à lista
    if (files.length < maxFiles) {
      onFilesChange([...files, pdfFile]);
    }
    
    setShowScanner(false);
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept={acceptedTypes}
          className="hidden"
        />
        
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Arraste arquivos aqui ou{' '}
          <button
            type="button"
            onClick={onButtonClick}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            clique para selecionar
          </button>
        </p>
        
        <div className="flex justify-center gap-2 mt-4">
          <Button
            type="button"
            onClick={onButtonClick}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Selecionar Arquivo
          </Button>
          {enableScanner && (
            <Button
              type="button"
              onClick={() => setShowScanner(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
            >
              <Scan className="w-4 h-4" />
              Digitalizar Documento
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-400">
          Formatos aceitos: {acceptedTypes.replace(/\./g, '').toUpperCase()}
        </p>
        <p className="text-sm text-gray-400">
          Máximo: {maxFiles} arquivos
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">{label} ({files.length})</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <File className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Document Scanner Modal */}
      {enableScanner && (
        <DocumentScannerFixed
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onSavePDF={handleScannerPDF}
        />
      )}
    </div>
  );
};
