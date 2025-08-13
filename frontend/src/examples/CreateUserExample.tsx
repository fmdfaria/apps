import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhatsAppInput } from '@/components/ui/whatsapp-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CreateUserRequest, CreateUserResponse } from '@/types/User';

/**
 * Exemplo de como implementar o formulário de criação de usuário
 * com o novo sistema de primeiro login e WhatsApp obrigatório
 */
export const CreateUserExample: React.FC = () => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    nome: '',
    email: '',
    whatsapp: '',
  });
  
  const [whatsAppValid, setWhatsAppValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateUserResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!whatsAppValid) {
      setError('WhatsApp inválido');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simula chamada para API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar usuário');
      }
      
      const data: CreateUserResponse = await response.json();
      setResult(data);
      
      // Limpa o formulário
      setFormData({ nome: '', email: '', whatsapp: '' });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <WhatsAppInput
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(value) => setFormData(prev => ({ ...prev, whatsapp: value }))}
                onValidityChange={setWhatsAppValid}
                error={!whatsAppValid && formData.whatsapp.length > 0}
              />
              <p className="text-sm text-gray-500">
                Formato: +55 (11) 99999-9999
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !whatsAppValid}
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>

          {result && (
            <Alert className="mt-4">
              <AlertDescription className="space-y-2">
                <p><strong>Usuário criado com sucesso!</strong></p>
                <p><strong>Nome:</strong> {result.user.nome}</p>
                <p><strong>Email:</strong> {result.user.email}</p>
                <p><strong>WhatsApp:</strong> {result.user.whatsapp}</p>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">
                    Senha Temporária:
                  </p>
                  <code className="text-lg font-mono bg-yellow-100 px-2 py-1 rounded">
                    {result.senhaTemporaria}
                  </code>
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ Informe esta senha ao usuário. Ela será solicitada no primeiro login.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};