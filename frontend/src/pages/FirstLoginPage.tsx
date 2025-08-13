import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Shield, CheckCircle2 } from 'lucide-react';
import { firstLogin } from '@/services/auth';
import { AppToast } from '@/services/toast';
import type { FirstLoginRequest } from '@/types/User';

interface FirstLoginPageProps {
  email: string;
  onSuccess: (authData: any) => void;
  onCancel: () => void;
}

export const FirstLoginPage: React.FC<FirstLoginPageProps> = ({ 
  email, 
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<FirstLoginRequest>({
    email,
    senhaAtual: '',
    novaSenha: '',
  });
  
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validações da senha
  const hasMinLength = formData.novaSenha.length >= 8;
  const passwordsMatch = formData.novaSenha === confirmSenha && confirmSenha.length > 0;
  
  const isPasswordValid = hasMinLength;
  const canSubmit = isPasswordValid && passwordsMatch && formData.senhaAtual.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await firstLogin(formData);
      AppToast.success('Primeiro login realizado', {
        description: 'Sua senha foi alterada com sucesso!'
      });
      onSuccess(result);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Erro desconhecido';
      setError(errorMessage);
      AppToast.error('Erro no primeiro login', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Primeiro Login
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Por segurança, você deve alterar sua senha temporária na primeira vez que acessa o sistema.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (readonly) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span>📧</span>
                <span>E-mail</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* Senha atual */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Senha Temporária</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={formData.senhaAtual}
                  onChange={(e) => setFormData(prev => ({ ...prev, senhaAtual: e.target.value }))}
                  placeholder="Digite a senha temporária recebida"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nova senha */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Nova Senha</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={formData.novaSenha}
                  onChange={(e) => setFormData(prev => ({ ...prev, novaSenha: e.target.value }))}
                  placeholder="Digite sua nova senha"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Confirmar Nova Senha</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Critérios da senha */}
            {formData.novaSenha && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p className="text-xs font-medium text-gray-700 mb-2">Critérios da senha:</p>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-1 ${hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  {confirmSenha && (
                    <div className={`flex items-center gap-1 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Senhas coincidem</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};