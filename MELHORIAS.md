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


### AgendamentosPage, AprovarPage, AtenderPage, LiberarPage
- ✅ Ordenar os dados por numero/alfabetico: Data > Hora > Paciente

### LiberarPage
- ✅ Corrigir o erro na linha 750: Property 'path' does not exist on type 'RouteInfo'.
- ✅ Corrigir o erro na linha 751: Property 'method' does not exist on type 'RouteInfo'.

### OcupacaoPage
- ✅ Atualizar o header da pagina para ficar igual a estilização (ex: RecursosPage) com os componentes abaixo:
--✅ Titulo | Campo de Busca | Filtros | Toogle Tabela | Cards
--✅ Deletar as informações do CARD: Profissionais, recursos, 7 dias, média, e botão atualizar.
--✅ Criar um Toogle grande abaixo do header (parecido com o utilizado na pagina DisponibilidadeProfissionaisPage 'Horarios Semanais' e Data Espeficica) para separar Profissional | Recursos para separar o conteudo.
--✅ Deixar a página mais moderna igual RecursosPage.
--✅ Criar uma barra de rolagem para o conteúdo somente... deixando o header fixo no topo.

### Criar uma nova pagina 'PedidosMedicosPage'
- ✅ Criar a pagina em /src/pages/dashboard
- ✅ Criar um CARD na pagina principal dos dashboard para direcionar para nova pagina criada com o nome 'Pedidos Medicos'
- ✅ O Vencimento dos pedidos médicos são de 6 meses, a contar da dataPedidoMedico registrado na tabela 'pacientes'
- ✅ Criar duas métricas, lista de  pedidos com 30 dias para vencer e pedidos já vencidos.

### Melhorias consistência no toast
- ✅ Deixar somente AppToast como padrão da aplicação.
- ✅ Verificar onde utiliza use-toast e efetuar alteração.
- ✅ depois que alterar tudo, deletar o toast que não vamos utilizar mais... manter somente AppToast.

### LiberarPage
- ✅ Retirar os console.log e debug existentes da pagina.

### PedidosMedicosPage
- ✅ está aparecendo que tem 2 pedidos vencidos no toogle Vencidos, porém, os dados não foram carregados na tabela / card.
- ✅ Otimizar melhor a visão de CARDs: Deixando Convênio | Carteirinha na mesma linha e Data do Pedido e data de vencimento tbm.
- ✅ Adicionar uma coluna ação no final da tabela e botões 'Editar paciente', 'Gerenciar Anexo' e 'Dados do Convênio' e chamar os mesmos modais existentes na PacientesPage. Não criar novos modais, utiliza o mesmo.
- ✅ Formatar a coluna de whatsapp para ficar igual de PacientesPage.
- ✅ Corrigir erro de sintaxe JSX causado por funções duplicadas no código.
- ✅ Corrigir máscara do WhatsApp no modal Editar Paciente quando chamado da PedidosMedicosPage.
- ✅ Implementar funcionalidades para Editar, Anexo e Convenio - atualizar no banco de dados.
- ✅ Corrigir campo "Data Pedido Médico" não carregando ao abrir modal Dados do Convênio.
- ✅ Corrigir inconsistência na exibição de datas - tabela mostrava 17/02/2025 mas modal 18/02/2025, banco tem 18/02/2025.

### src/services/ocupacao.ts
- ✅ Retirar os console.log
- ✅ Retirar debugs
- ✅ Está com erro na linha 119: Property 'ativo' does not exist on type 'Profissional'. Não existe coluna 'ativo' no banco de dados... então, retirar essa funcionalidade do frontend.

### PacientesPage
- No modal de anexos, permitir mais de 1 anexo (não limitar).
- Apresentar os anexos em Anexos Enviados, com opção 'x' para excluir um anexo.
- Quando for excluir um anexo

### Dashboard
- ✅ Retirar os botões do header da pagina Novo Agendamento, Ver Calendário, Dashboard Ocupação, Pedidos Médicos, Relatórios.
- ✅ Trocar o CARD atual 'Métricas Rápidas' pelos dados simplificados da pagina OcupaçãoPage, colocar um icone 'olho' para quando clicar direcionar para pagina 'OcupacaoPage'. Adicionar os dados de ocupação (somar todos profissionais)e o percentual considerando todos profissionais tbm, adicionar tbm a qtd de agendamento.
- ✅ Trocar o CARD atual 'Atividades Recentes' pelos dados simplificados da pagina PedidosMedicosPage, colocar os valores no card e adicionar tbm o icone 'olho' para direcionar para pagina 'PedidosMedicosPage'.
- ✅  No CARD Profissionais Ativos: renomear para Profissionais e mostrar somente a qtd existente de profissionais. retirar a opção de ativos e sua funcionalidade, pois não existe no banco de dados isso.
- ✅ no CARD Agendamento Hoje: buscar dados reais dos agendamentos.
- ✅ Deletar o CARD Ocupação Média.

### AgendamentosPage
- Cada profissional logado, só pode visualizar os agendamentos dele.

### AtenderPage
- Funcionalidade para dizer de o paciente compareceu ou não atendimento. (compareceu / não compareceu - SIM / NÃO).
--Ajustar backend para incluir nova coluna.
--Criar um nova coluna na tabela com essa informação
- Funcionalidade para dizer se o profissional e pacientes assinaram a guia.
-- (SIM / NÃO) individualmente..
-Obrigatório Evoluir paciente para seguir para proximas fase (aprovaratendimento)
- Botão Finalizar atendimento só pode estar habilitado se o profissional responder as duas perguntas.

### AtenderPage
- ✅ Criar um novo modal, moderno com o nome 'EvolucaoPacientesModal' e salvar em /src/pages/pacientes/ , que siga o padrão existente para os demais da aplicação utilizar o CriarProfissionalModal.tsx como referência de estilo.
--✅ Esse novo modal vai precisar ter os campos: Paciente, Data e Hora (do agendamento), Data Evolução, Objetivo da Sessão, Descrição da Evolução.
--✅ se necessário veja o arquivo schema.prisma para entender a estrutura do backend.
--✅ Esse modal será responsável por criar e editar os dados da tabela 'evolucoes_pacientes' do banco de dados.
--✅ utilizar as rotas para api:
---✅ app.post('/evolucoes', controller.create);
---✅ app.get('/evolucoes', controller.list);
---✅ app.put('/evolucoes/:id', controller.update);
---✅ app.delete('/evolucoes/:id', controller.delete);

### Agendamentos
- Criar funcionalidade para editar Agendamentos, vincular ao botão 'Editar Agendamento'.
--Essa funcionalidade deve permitir edicao de agendamentos futuros (não permitir edição de agendamentos passados).
--Considerar edição das recorrencias ou somente um agendamento.
--Manter a consistência da estilização do Novo Agendamento por exemplo.

- Adicionar um novo botão 'Cancelar' entre os botões editar e excluir.
--criar uma funcionalidade para esse botão para alterar o status do agendamento para 'CANCELADO', utilizar a rota da api PUT /agendamentos/:id passando status:"CANCELADO".