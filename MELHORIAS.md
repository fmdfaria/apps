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

### FechamentoPage - Aba Particular
- Para fechamentos particulares, o recebimento pode ser feito de maneira 'Avulso' ou 'Mensal' e com pagamento antecipado 'SIM' ou 'NÃO' ... essas informações ficam salvar na tabela precos_particulares obtido na rota /precos-particulares do backend..
- então para fechamento particular (pagamento) 'Avulso' deve cadastrar na tabela linha por linha.
- adicionar as colunas 'tipo_pagamento' e 'pagamento_antecipado' antes da coluna ação da tabela.


Criei duas novas colunas na tabela agendamentos:
ALTER TABLE agendamentos
ADD COLUMN recebimento BOOLEAN DEFAULT FALSE,
ADD COLUMN pagamento BOOLEAN DEFAULT FALSE;

objetivo dessas colunas é fazer a gestão dos pagamentos e recebimentos de cada agendamento.

ajustar o backend para incluir essa coluna na regra de criação, edição de agendamentos....
ajustar o frontend para enviar os dados caso necessário, visto que será default FALSE.. e a gestão desse status não será feito no ato do agendamento, e sim no fechamento.