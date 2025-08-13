import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { changePassword } from '@/services/auth';
import { AppToast } from '@/services/toast';

interface AlterarSenhaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AlterarSenhaModal({ open, onClose }: AlterarSenhaModalProps) {
  const [formData, setFormData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    setFormData({
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: '',
    });
    setShowPasswords({
      atual: false,
      nova: false,
      confirmar: false,
    });
    onClose();
  };

  const validateForm = (): boolean => {
    if (!formData.senhaAtual.trim()) {
      AppToast.error('Senha atual é obrigatória');
      return false;
    }

    if (!formData.novaSenha.trim()) {
      AppToast.error('Nova senha é obrigatória');
      return false;
    }

    if (formData.novaSenha.length < 8) {
      AppToast.error('Nova senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (formData.novaSenha !== formData.confirmarSenha) {
      AppToast.error('Confirmação de senha não confere');
      return false;
    }

    if (formData.senhaAtual === formData.novaSenha) {
      AppToast.error('A nova senha deve ser diferente da senha atual');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await changePassword(formData.senhaAtual, formData.novaSenha);
      AppToast.success('Senha alterada com sucesso!');
      handleClose();
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao alterar senha';
      AppToast.error('Erro ao alterar senha', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'atual' | 'nova' | 'confirmar') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Alterar Senha
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Senha Atual */}
          <div className="space-y-2">
            <Label htmlFor="senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Input
                id="senhaAtual"
                type={showPasswords.atual ? 'text' : 'password'}
                value={formData.senhaAtual}
                onChange={(e) => setFormData(prev => ({ ...prev, senhaAtual: e.target.value }))}
                disabled={isLoading}
                className="pr-10"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('atual')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPasswords.atual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={showPasswords.nova ? 'text' : 'password'}
                value={formData.novaSenha}
                onChange={(e) => setFormData(prev => ({ ...prev, novaSenha: e.target.value }))}
                disabled={isLoading}
                className="pr-10"
                placeholder="Digite a nova senha (mín. 8 caracteres)"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('nova')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPasswords.nova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmarSenha"
                type={showPasswords.confirmar ? 'text' : 'password'}
                value={formData.confirmarSenha}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                disabled={isLoading}
                className="pr-10"
                placeholder="Confirme a nova senha"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirmar')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPasswords.confirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}