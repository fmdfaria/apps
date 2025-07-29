import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload } from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';
import { useInputMask } from '@/hooks/useInputMask';

interface ProfissionalFormProps {
  profissional?: any;
  onClose: () => void;
  onSave: () => void;
}

export const ProfissionalForm = ({ profissional, onClose, onSave }: ProfissionalFormProps) => {
  const [formData, setFormData] = useState({
    nome: profissional?.nome || '',
    cpf: profissional?.cpf || '',
    crm: profissional?.crm || '',
    especialidade: profissional?.especialidade || '',
    telefone: profissional?.telefone || '',
    email: profissional?.email || '',
    endereco: profissional?.endereco || '',
    observacoes: profissional?.observacoes || '',
  });

  const [errors, setErrors] = useState<any>({});
  const [files, setFiles] = useState<File[]>([]);

  const cpfMask = useInputMask('999.999.999-99');
  const phoneMask = useInputMask('(99) 99999-9999');

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (!formData.crm.trim()) newErrors.crm = 'CRM é obrigatório';
    if (!formData.especialidade.trim()) newErrors.especialidade = 'Especialidade é obrigatória';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form data:', formData);
      console.log('Files:', files);
      onSave();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={onClose} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {profissional ? 'Editar Profissional' : 'Novo Profissional'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      className={errors.nome ? 'border-red-500' : ''}
                    />
                    {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => {
                        const masked = cpfMask(e.target.value);
                        handleInputChange('cpf', masked);
                      }}
                      placeholder="000.000.000-00"
                      className={errors.cpf ? 'border-red-500' : ''}
                    />
                    {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
                  </div>

                  <div>
                    <Label htmlFor="crm">CRM *</Label>
                    <Input
                      id="crm"
                      value={formData.crm}
                      onChange={(e) => handleInputChange('crm', e.target.value)}
                      placeholder="12345-SP"
                      className={errors.crm ? 'border-red-500' : ''}
                    />
                    {errors.crm && <p className="text-red-500 text-sm mt-1">{errors.crm}</p>}
                  </div>

                  <div>
                    <Label htmlFor="especialidade">Especialidade *</Label>
                    <Select value={formData.especialidade} onValueChange={(value) => handleInputChange('especialidade', value)}>
                      <SelectTrigger className={errors.especialidade ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardiologia">Cardiologia</SelectItem>
                        <SelectItem value="pediatria">Pediatria</SelectItem>
                        <SelectItem value="ortopedia">Ortopedia</SelectItem>
                        <SelectItem value="dermatologia">Dermatologia</SelectItem>
                        <SelectItem value="neurologia">Neurologia</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.especialidade && <p className="text-red-500 text-sm mt-1">{errors.especialidade}</p>}
                  </div>

                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => {
                        const masked = phoneMask(e.target.value);
                        handleInputChange('telefone', masked);
                      }}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Textarea
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  files={files}
                  onFilesChange={setFiles}
                  acceptedTypes=".pdf,.jpg,.jpeg,.png"
                  maxFiles={5}
                  label="Comprovantes e Documentos"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {profissional ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
};
