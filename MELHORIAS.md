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



### Excluir Agendamentos
- Criar uma funcionalidade para quando apertar no botão Excluir Agendamento na pagina AgendamentosPage, deve chamar a tela de confirmação com as opções de excluir somente o agendamento selecionado ou todos da recorrencia. 
- Deve ser considerado agendamentos recorrentes todos os agendamento com Data + Hora feitos para o mesmo Paciente + Profissional + Serviço + recorrencia do tipo (semanal, quinzenal ou mensal)

