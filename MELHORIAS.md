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

### AprovarPage ✅
- Criar um botão 'Digitalizar Guias' e colocar entre 'Visualizar' e 'Aprovar Atendimento' ✅
- Criar uma funcionalidade para escanear um documento quando clicar no botão ✅
- Essa funcionalidade deve abrir a camera do dispositivo e permitir fazer o scanner com a camera. ✅
- utilizar as funcionalidades de anexos para anexar o documento vinculado a entidade agendamentos. ✅