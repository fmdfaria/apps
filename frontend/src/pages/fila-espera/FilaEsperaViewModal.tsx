import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  User,
  FileText,
  UserCheck,
  Clock,
  Calendar,
  Info,
  Key,
  CheckCircle
} from 'lucide-react';
import type { FilaEspera, HorarioPreferencia } from '@/types/FilaEspera';
import { formatarDataHoraLocal } from '@/utils/dateUtils';

const HORA_LABEL: Record<HorarioPreferencia, string> = {
  'MANHÃ': 'Manhã',
  'TARDE': 'Tarde',
  'NOITE': 'Noite',
};

const getHorarioColor = (horario: HorarioPreferencia) => {
  const cores = {
    'MANHÃ': 'bg-yellow-100 text-yellow-700',
    'TARDE': 'bg-orange-100 text-orange-700', 
    'NOITE': 'bg-blue-100 text-blue-700'
  };
  return cores[horario] || 'bg-gray-100 text-gray-700';
};

const getStatusColor = (status: string) => {
  const cores = {
    'pendente': 'bg-orange-100 text-orange-700',
    'agendado': 'bg-green-100 text-green-700',
    'cancelado': 'bg-red-100 text-red-700',
    'finalizado': 'bg-gray-100 text-gray-700'
  };
  return cores[status] || 'bg-gray-100 text-gray-700';
};

interface FilaEsperaViewModalProps {
  isOpen: boolean;
  item: FilaEspera | null;
  onClose: () => void;
}

export default function FilaEsperaViewModal({
  isOpen,
  item,
  onClose
}: FilaEsperaViewModalProps) {
  const formatarDataHora = formatarDataHoraLocal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <Info className="w-6 h-6 text-blue-600" />
              Detalhes do Item da Fila
            </span>
            {item && (
              <Badge className={`${getStatusColor(item.status || 'pendente')} mr-8`}>
                {item.status || 'pendente'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {item ? (
          <div className="space-y-4">
            {/* Informações do Item */}
            <div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Linha 1 */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Nome Paciente:</span>
                  <span className="text-gray-700">{item.pacienteNome || `ID: ${item.pacienteId}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Nome Serviço:</span>
                  <span className="text-gray-700">{item.servicoNome || '-'}</span>
                </div>
                
                {/* Linha 2 */}
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Nome Profissional:</span>
                  <span className="text-gray-700">{item.profissionalNome || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Horário:</span>
                  <Badge className={`text-xs ${getHorarioColor(item.horarioPreferencia)}`}>
                    {HORA_LABEL[item.horarioPreferencia]}
                  </Badge>
                </div>
                
                {/* Linha 3 */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Data Criação:</span>
                  <span className="text-gray-700">{item.createdAt ? formatarDataHora(item.createdAt).data : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Ativo:</span>
                  <Badge variant={item.ativo ? "default" : "secondary"} className="text-xs">
                    {item.ativo ? 'Sim' : 'Não'}
                  </Badge>
                </div>
                
                {/* Linha 4 - Observação */}
                {item.observacao && (
                  <div className="flex items-start gap-2 col-span-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <span className="font-medium">Observação:</span>
                    <span className="text-gray-700">{item.observacao}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            Nenhum item selecionado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}