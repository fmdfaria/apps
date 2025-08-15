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

### Criar Nova Pagina 'PagamentosPage'
- Deve copiar FechamentoPage apresentando todos os agendamentos com status FINALIZADO.
- É a página responsável pelo pagamento financeiro dos agendamentos FINALIZADOS pelos profissionais.
- Não precisa ter abas, deixe somente a tabela / CARDs.
- Deve conter as colunas Profissional | Data Inicio | Data Fim | Qtd | Valor a pagar
-- Data Inicio - Data do agendamento mais antigo com status FINALIZADOS.
-- Data Fim - Data do agendametno mais novo com status FINALIZADOS.
-- Qtd - Mostrar a qtd de atendimentos daquele profissional FINALIZADOS.
-- Valor a pagar - O valor total a ser pago deve considerar:
---SE existir valor do ID PROFISSIONAL na tabela precos_servicos_profissional, coluna = 'preco_profissional'
---SE não existir na tabela precos_servicos_profissional, deve utilizar o preço tabelado que está na tabela 'servicos', coluna as colunas de 'preco' e 'percentual_profissional'

### DisponibilidadePage
- Quando profissional logar, deve fixar ele na seleção.

### ProfissionaisPage
- No modal Editar Endereço retirar opcao para Digitalizar Documento.

### Agendamentos / Calendario
- Alterar recorrencia, não está editando todos da serie..

### LiberarPage
- Arrumar forma de para o particular efetuar cobrança.
