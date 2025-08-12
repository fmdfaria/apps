# Melhorias

## Regras
- Quando finalizar uma melhoria, coloque ✅ na frente do item que foi implementado.
- Faça uma melhoria por vez, e aguarde eu testar manualmente antes de seguir para proxima.
- As melhorias estão listadas como item ###.
- O item ### é a referência da página, arquivo para ser modificado / melhorado, e abaixo tem o que precisa ser melhorado.
- O item - é o que preicsa fazer e o item -- são detalhers para o item.

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

### PedidosMedicosPage
- está aparecendo que tem 2 pedidos vencidos no toogle Vencidos, porém, os dados não foram carregados na tabela / card.

### src/services/ocupacao.ts
- Retirar os console.log
- Retirar debugs
- Está com erro na linha 119: Property 'ativo' does not exist on type 'Profissional'. Não existe coluna 'ativo' no banco de dados... então, retirar essa funcionalidade do frontend.

### PacientesPage
- No modal de anexos, permitir mais de 1 anexo (não limitar).
- Apresentar os anexos em Anexos Enviados, com opção 'x' para excluir um anexo.
- Quando for excluir um anexo

### Dashboard
- Retirar os botões do header da pagina Novo Agendamento, Ver Calendário, Dashboard Ocupação, Pedidos Médicos, Relatórios.
- Trocar o CARD atual 'Métricas Rápidas' pelos dados simplificados da pagina OcupaçãoPage, colocar um icone 'olho' para quando clicar direcionar para pagina 'OcupacaoPage'. Adicionar os dados de ocupação (somar todos profissionais)e o percentual considerando todos profissionais tbm, adicionar tbm a qtd de agendamento.
- Trocar o CARD atual 'Atividades Recentes' pelos dados simplificados da pagina PedidosMedicosPage, colocar os valores no card e adicionar tbm o icone 'olho' para direcionar para pagina 'PedidosMedicosPage'.
- No CARD Profissionais Ativos: renomear para Profissionais e mostrar somente a qtd existente de profissionais. retirar a opção de ativos e sua funcionalidade.
- no CARD Agendamento Hoje: buscar dados reais dos agendamentos.
- Deletar o CARD Ocupação Média.

### DetalhesAgendamentoModal
- Simplificar e modernizar o modal, utilize o modal FormularioPorProfissional como modelo para verificar os componentes utilizados. Retirar a parte de 'informação do Sistema'

### Agendamentos
- Criar funcionalidade para editar Agendamentos, vincular ao botão 'Editar Agendamento'.
--Essa funcionalidade deve permitir edicao de agendamentos futuros (não permitir edição de agendamentos passados).
--Considerar edição das recorrencias ou somente um agendamento.

- Adicionar um novo botão 'Cancelar' entre os botões editar e excluir.
--criar uma funcionalidade para esse botão para alterar o status do agendamento para 'CANCELADO', utilizar a rota da api PUT /agendamentos/:id passando status:"CANCELADO".