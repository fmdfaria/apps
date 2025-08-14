import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DigitalizarGuiasModal } from '@/components/agendamentos/DigitalizarGuiasModal';
import type { Agendamento } from '@/types/Agendamento';

export const TestDigitalizarGuias: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  // Mock de um agendamento para teste
  const mockAgendamento: Agendamento = {
    id: 'test-agendamento-123',
    pacienteId: 'test-paciente-123',
    pacienteNome: 'João Silva Santos',
    profissionalId: 'test-profissional-123',
    profissionalNome: 'Dr. Maria Oliveira',
    servicoId: 'test-servico-123',
    servicoNome: 'Consulta Cardiológica',
    dataHoraInicio: new Date().toISOString(),
    dataHoraFim: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'AGENDADO',
    observacoes: 'Consulta de retorno',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleSuccess = () => {
    console.log('Documento digitalizado com sucesso!');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🏥 Teste - Digitalizar Guias</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">📋 Agendamento de Teste</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Paciente:</strong> {mockAgendamento.pacienteNome}</p>
            <p><strong>Profissional:</strong> {mockAgendamento.profissionalNome}</p>
            <p><strong>Serviço:</strong> {mockAgendamento.servicoNome}</p>
          </div>
          <div>
            <p><strong>Data:</strong> {new Date(mockAgendamento.dataHoraInicio).toLocaleDateString('pt-BR')}</p>
            <p><strong>Hora:</strong> {new Date(mockAgendamento.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Status:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{mockAgendamento.status}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">🎯 Funcionalidades Integradas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold text-purple-800 mb-2">📱 Scanner Inteligente</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Detecção automática de bordas</li>
              <li>• Ajuste manual de pontos</li>
              <li>• Correção de perspectiva</li>
              <li>• Controle de orientação PDF</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold text-blue-800 mb-2">💾 Upload Tradicional</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Upload de imagens da galeria</li>
              <li>• Nomenclatura personalizada</li>
              <li>• Padrão RA_doc1 opcional</li>
              <li>• Cropper de imagem</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>📝 Nota:</strong> Esta funcionalidade agora suporta tanto PDFs gerados pelo scanner inteligente quanto imagens tradicionais.
            O sistema detecta automaticamente o tipo de arquivo e ajusta a interface adequadamente.
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">🚀 Como Testar</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Clique no botão abaixo para abrir o modal de digitalização</li>
          <li>Escolha entre:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><strong>Scanner Inteligente:</strong> Captura com câmera e gera PDF automaticamente</li>
              <li><strong>Upload de Arquivo:</strong> Seleciona imagem da galeria (funcionalidade original)</li>
            </ul>
          </li>
          <li>Para o Scanner:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Capture o documento com a câmera</li>
              <li>Ajuste os pontos vermelhos se necessário</li>
              <li>Escolha orientação do PDF (automático, vertical, horizontal)</li>
              <li>Gere o PDF</li>
            </ul>
          </li>
          <li>Adicione descrição e salve o documento</li>
        </ol>
      </div>
      
      <div className="text-center">
        <Button
          onClick={() => setShowModal(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
        >
          📄 Abrir Digitalizar Guias (Integrado)
        </Button>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p><strong>💡 Dicas:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Use o scanner para documentos físicos (melhor qualidade e formato PDF)</li>
          <li>Use upload para imagens já digitalizadas</li>
          <li>O PDF é gerado automaticamente com a orientação da tela (ou manual)</li>
          <li>Documentos PDF são mais compactos e profissionais</li>
        </ul>
      </div>
      
      <DigitalizarGuiasModal
        isOpen={showModal}
        agendamento={mockAgendamento}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};