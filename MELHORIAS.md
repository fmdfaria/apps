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


### Funcionalidade Online


### AgendamentosPage
- Vamos deixar o campo 'Buscar Agendamentos...' sendo utilizados com a query search: get /agendamentos?search=
- Quando clicar no botão 'Filtros' chamar as api get /convenios  /servicos  /pacientes  /profissionais preenchendo os campos dos filtros, utilizar o componente SingleSelectDropDown

Após clicar em aplicar filtro, utilizar para aplicar o filtro:

-- Data Inicio | Data Fim : /agendamentos?page=1&limit=10&dataInicio=2025-08-26&dataFim=2025-08-27
-- Convênio : /agendamentos?page=1&limit=10&convenioId=
-- Serviço : /agendamentos?page=1&limit=10&servicoId=
-- Tipo de Atendimento : /agendamentos?page=1&limit=10&tipoAtendimento=
-- Paciente : /agendamentos?page=1&limit=10&pacienteId=
-- Profissionais : /agendamentos?page=1&limit=10&profissionalId=

Se preencher e selecionar mais campos, efetuar a busca unica com todos os parametros.


### Agendamentos - AtenderPage
- Preciso criar uma nova coluna chamada 'data_atendimento' na tabela 'agendamentos' no banco de dados, então forneça um SQL para adicionar essa coluna.
- Essa nova coluna vai servir para registrar a 'Data do Atendimento' que está atualmente no put /agendamentos no Modal AtenderAgendamentoModal
- Atualizar o backend e frontend para atender a funcionalidade dessa nova coluna.
