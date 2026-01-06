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


Eu gostaria de deixar assim:

1- Quando carregar a pagina /agendamentos chamar API do backend retirando os status ARQUIVADO e CANCELADO.
2- Quando carregar a pagina /agendamentos utilizar API sem dataInicio, e deixar dataFim com 90 dias para frente. Ex: /agendamentos?page=1&limit=10&&dataFim=2026-04-01 (mantendo os status ARQUIVADO e CANCELADO fora)
3- Quando utilizar o campo de busca, não aplicar nenhum filtro, ou seja, aparecer todos os status (inclusive ARQUIVADO e CANCELADO), e não utilizar dataInico e dataFim para filtrar o periodo.

Qual a melhor forma de fazer isso sem afetar muito o backend... pois tenho outras paginas que utilizam as mesmas rotas?