/**
 * EXEMPLOS DE USO DO CONFIRMATION DIALOG
 * 
 * Este arquivo contém exemplos práticos de como usar o ConfirmationDialog
 * em diferentes situações na aplicação.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ConfirmationDialog, { useConfirmationDialog } from './confirmation-dialog';

export const ConfirmationDialogExamples: React.FC = () => {
  // Exemplo 1: Uso básico com estados manuais
  const [showBasic, setShowBasic] = useState(false);

  // Exemplo 2: Uso do hook para facilitar
  const { showConfirmation, ConfirmationDialog: HookDialog } = useConfirmationDialog();

  // Exemplos específicos para diferentes casos de uso

  const handleDeleteUser = () => {
    showConfirmation({
      type: 'danger',
      title: 'Excluir Usuário',
      description: 'Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.',
      entityName: 'João Silva',
      entityType: 'usuário',
      confirmText: 'Excluir Usuário',
      cancelText: 'Cancelar',
      onConfirm: () => {
        console.log('Usuário excluído!');
        // Lógica de exclusão aqui
      }
    });
  };

  const handleResourceInconsistency = () => {
    showConfirmation({
      type: 'alert',
      title: 'Recurso Inconsistente Detectado',
      description: 'O recurso selecionado não está configurado nas disponibilidades do profissional.',
      details: [
        'Recurso: Sala 1 - Cardiologia',
        'Profissional: Dr. João Silva',
        'Horário: 14:00 - 15:00',
        'Esta inconsistência pode causar conflitos de agenda.'
      ],
      actions: [
        {
          label: 'Continuar Mesmo Assim',
          onClick: () => console.log('Continuando...'),
          className: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white'
        },
        {
          label: 'Escolher Outro Recurso',
          variant: 'outline',
          onClick: () => console.log('Cancelando...')
        }
      ],
      defaultActions: false,
      maxWidth: 'lg'
    });
  };

  const handleUnsavedChanges = () => {
    showConfirmation({
      type: 'warning',
      title: 'Alterações Não Salvas',
      description: 'Você possui alterações não salvas que serão perdidas se sair agora.',
      details: [
        'Dados do formulário preenchidos',
        'Configurações modificadas',
        'Última salvamento: há 5 minutos'
      ],
      actions: [
        {
          label: 'Salvar e Sair',
          onClick: () => console.log('Salvando e saindo...'),
          className: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
        },
        {
          label: 'Sair Sem Salvar',
          variant: 'destructive',
          onClick: () => console.log('Saindo sem salvar...')
        },
        {
          label: 'Continuar Editando',
          variant: 'outline',
          onClick: () => console.log('Continuando...')
        }
      ],
      defaultActions: false,
      maxWidth: 'xl'
    });
  };

  const handleSuccessConfirmation = () => {
    showConfirmation({
      type: 'success',
      title: 'Operação Realizada com Sucesso!',
      description: 'O agendamento foi criado e o paciente foi notificado por email.',
      details: [
        'Agendamento ID: #12345',
        'Data: 15/08/2025 14:00',
        'Paciente: Maria Silva',
        'Email enviado com sucesso'
      ],
      confirmText: 'Visualizar Agendamento',
      cancelText: 'Fechar',
      onConfirm: () => console.log('Navegando para agendamento...')
    });
  };

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">Exemplos de ConfirmationDialog</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Exemplo Básico */}
        <div className="space-y-2">
          <h3 className="font-semibold">1. Uso Básico (estados manuais)</h3>
          <Button onClick={() => setShowBasic(true)}>
            Mostrar Confirmação Básica
          </Button>
          <ConfirmationDialog
            open={showBasic}
            onClose={() => setShowBasic(false)}
            type="question"
            title="Confirmar Ação"
            description="Tem certeza que deseja realizar esta operação?"
            onConfirm={() => {
              console.log('Confirmado!');
              setShowBasic(false);
            }}
          />
        </div>

        {/* Exemplo com Hook */}
        <div className="space-y-2">
          <h3 className="font-semibold">2. Exclusão de Usuário (Perigo)</h3>
          <Button variant="destructive" onClick={handleDeleteUser}>
            Excluir Usuário
          </Button>
        </div>

        {/* Exemplo de Recurso Inconsistente */}
        <div className="space-y-2">
          <h3 className="font-semibold">3. Recurso Inconsistente (Alert)</h3>
          <Button variant="outline" onClick={handleResourceInconsistency}>
            Simular Inconsistência
          </Button>
        </div>

        {/* Exemplo de Mudanças Não Salvas */}
        <div className="space-y-2">
          <h3 className="font-semibold">4. Alterações Não Salvas (Warning)</h3>
          <Button onClick={handleUnsavedChanges}>
            Tentar Sair com Alterações
          </Button>
        </div>

        {/* Exemplo de Sucesso */}
        <div className="space-y-2">
          <h3 className="font-semibold">5. Confirmação de Sucesso</h3>
          <Button variant="outline" onClick={handleSuccessConfirmation}>
            Simular Sucesso
          </Button>
        </div>
      </div>

      {/* Dialog do hook */}
      <HookDialog />
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Tipos Disponíveis:</h3>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>danger</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>info</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>question</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>error</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>alert</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialogExamples;