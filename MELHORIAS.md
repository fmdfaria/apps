# Melhorias

## Regras
- Quando finalizar uma melhoria, coloque ✅ na frente do item que foi implementado.
- Faça uma melhoria por vez, e aguarde eu testar manualmente antes de seguir para proxima.
- As melhorias estão listadas como item ###.
- O item ### é a referência da página, arquivo para ser modificado / melhorado, e abaixo tem o que precisa ser melhorado.
- O item - é o que preicsa fazer e o item -- são detalhers para o item.
- Sempre siga o padrão de estilização e componentes já utilizados no projeto (Ex: RecursosPage, ServiçosPage, ProfissionaisPage...etc).
- Utilize os componentes padrão de layout para manter a responsividade da aplicação.
- Utilize os componentes já existentes na pasta ui/
- Utilize sempre o AppToast para manter o padrão de notificação.
- Não defina nada no frontend que afete o backend, veja sempre a estrutura do backend no arquivo @apps/backend/prisma/schema.prisma .. lá contém toda estrutura do meu banco de dados.


### LiberarPage
- Arrumar forma de para o particular efetuar cobrança.

### FormularioPorData
- Quando seleciona o recurso, está limpandos os campos.

### Verificar melhorias num geral dos modais de agendamentos.

### Ajustes
- Criei a coluna 'ativo' nas tabela pacientes, profissionais e servicos com default TRUE.

ALTER TABLE pacientes
ADD COLUMN ativo BOOLEAN DEFAULT TRUE;

ALTER TABLE profissionais
ADD COLUMN ativo BOOLEAN DEFAULT TRUE;

ALTER TABLE servicos
ADD COLUMN ativo BOOLEAN DEFAULT TRUE;

- agora preciso ajustar o backend e o frontend para considerar esse campo e essa funcionalidade  quando estiver ativo ou inativo.
- Não precisa rodar nada para atualizar o banco de dados, já está feito.
