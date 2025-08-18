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


### EditarInfoProfissionalModal
- Qdo seleciono um arquivo com nome muito grande, está quebrando e ultrapassando o modal... deixar o nome do arquivo truncado com ... no final e se passar o mouse em cima.. mostra o tooltip com o nome inteiro..
- Deixar enviar mais que 1 arquivo tbm
