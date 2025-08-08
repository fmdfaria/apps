  -- Nomes e descrições amigáveis para apresentação ao usuário

  INSERT INTO routes (path, method, nome, descricao, modulo, ativo) VALUES

  -- Módulo: Autenticação
  ('/register', 'POST', 'Cadastrar Usuário', 'Permite cadastrar novos usuários no 
  sistema', 'Autenticação', true),
  ('/login', 'POST', 'Fazer Login', 'Permite usuários fazerem login na plataforma',      
  'Autenticação', true),
  ('/logout', 'POST', 'Fazer Logout', 'Permite usuários saírem da plataforma com
  segurança', 'Autenticação', true),
  ('/refresh', 'POST', 'Renovar Sessão', 'Permite renovar automaticamente a sessão       
  do usuário', 'Autenticação', true),
  ('/password/request-reset', 'POST', 'Solicitar Redefinição de Senha', 'Permite
  solicitar redefinição de senha via email', 'Autenticação', true),
  ('/password/reset', 'POST', 'Redefinir Senha', 'Permite redefinir a senha usando       
  token enviado por email', 'Autenticação', true),
  ('/password/change', 'POST', 'Alterar Senha', 'Permite alterar a senha quando
  logado', 'Autenticação', true),
  ('/email/request-confirmation', 'POST', 'Solicitar Confirmação de Email', 'Permite     
   solicitar reenvio de confirmação de email', 'Autenticação', true),
  ('/email/confirm', 'POST', 'Confirmar Email', 'Permite confirmar endereço de email     
   usando token', 'Autenticação', true),

  -- Módulo: Gestão de Usuários
  ('/users', 'GET', 'Listar Usuários', 'Visualizar lista de todos os usuários
  cadastrados', 'Gestão de Usuários', true),
  ('/users/:id', 'GET', 'Visualizar Usuário', 'Ver detalhes específicos de um
  usuário', 'Gestão de Usuários', true),
  ('/users/:id', 'PUT', 'Editar Usuário', 'Modificar informações de usuários
  existentes', 'Gestão de Usuários', true),
  ('/users/:id', 'DELETE', 'Excluir Usuário', 'Remover usuário do sistema
  permanentemente', 'Gestão de Usuários', true),

  -- Módulo: Controle de Acesso (RBAC)
  ('/roles', 'POST', 'Criar Perfil', 'Criar novos perfis de acesso no sistema',
  'Controle de Acesso', true),
  ('/roles', 'GET', 'Listar Perfis', 'Visualizar todos os perfis de acesso
  disponíveis', 'Controle de Acesso', true),
  ('/roles/:id', 'PUT', 'Editar Perfil', 'Modificar configurações de perfis
  existentes', 'Controle de Acesso', true),
  ('/roles/:id', 'DELETE', 'Excluir Perfil', 'Remover perfil do sistema
  permanentemente', 'Controle de Acesso', true),

  ('/routes', 'POST', 'Cadastrar Rota', 'Adicionar novas rotas ao sistema de
  permissões', 'Controle de Acesso', true),
  ('/routes', 'GET', 'Listar Rotas', 'Ver todas as rotas disponíveis no sistema',        
  'Controle de Acesso', true),
  ('/routes/:id', 'PUT', 'Editar Rota', 'Modificar configurações de rotas
  existentes', 'Controle de Acesso', true),
  ('/routes/:id', 'DELETE', 'Excluir Rota', 'Remover rota do sistema de permissões',     
   'Controle de Acesso', true),

  ('/user-roles', 'POST', 'Atribuir Perfil', 'Conceder perfil de acesso a usuários',     
   'Controle de Acesso', true),
  ('/user-roles', 'GET', 'Listar Atribuições', 'Ver quais perfis estão atribuídos        
  aos usuários', 'Controle de Acesso', true),
  ('/user-roles/:id', 'PUT', 'Alterar Atribuição', 'Modificar perfis atribuídos aos      
  usuários', 'Controle de Acesso', true),
  ('/user-roles/:userId/:roleId', 'DELETE', 'Remover Perfil', 'Retirar perfil
  específico de um usuário', 'Controle de Acesso', true),
  ('/users/:userId/roles', 'GET', 'Ver Perfis do Usuário', 'Consultar perfis
  atribuídos a usuário específico', 'Controle de Acesso', true),
  ('/users/:userId/allowed-routes', 'GET', 'Ver Permissões', 'Consultar rotas
  permitidas para usuário específico', 'Controle de Acesso', true),

  ('/role-routes', 'POST', 'Conceder Permissão', 'Atribuir permissões específicas        
  aos perfis', 'Controle de Acesso', true),
  ('/role-routes', 'GET', 'Listar Permissões', 'Ver todas as permissões dos perfis',     
   'Controle de Acesso', true),
  ('/role-routes/:id', 'PUT', 'Alterar Permissão', 'Modificar permissões específicas     
   dos perfis', 'Controle de Acesso', true),
  ('/role-routes/:id', 'DELETE', 'Revogar Permissão', 'Remover permissão específica      
  de um perfil', 'Controle de Acesso', true),
  ('/role-routes/:roleId/:routeId', 'DELETE', 'Retirar Acesso', 'Remover acesso
  específico de perfil', 'Controle de Acesso', true),

  -- Módulo: Gestão de Profissionais
  ('/profissionais', 'POST', 'Cadastrar Profissional', 'Adicionar novos
  profissionais à clínica', 'Gestão de Profissionais', true),
  ('/profissionais', 'GET', 'Listar Profissionais', 'Ver todos os profissionais
  cadastrados', 'Gestão de Profissionais', true),
  ('/profissionais/:id', 'GET', 'Visualizar Profissional', 'Ver detalhes completos       
  de um profissional', 'Gestão de Profissionais', true),
  ('/profissionais/:id', 'PUT', 'Editar Profissional', 'Modificar informações dos        
  profissionais', 'Gestão de Profissionais', true),
  ('/profissionais/:id', 'DELETE', 'Excluir Profissional', 'Remover profissional do      
  sistema', 'Gestão de Profissionais', true),
  ('/profissionais/:id/endereco', 'PUT', 'Atualizar Endereço', 'Modificar dados de       
  endereço do profissional', 'Gestão de Profissionais', true),
  ('/profissionais/:id/informacao-profissional', 'PUT', 'Atualizar Info
  Profissional', 'Modificar dados profissionais e conselho', 'Gestão de
  Profissionais', true),
  ('/profissionais/:id/dados-bancarios', 'PUT', 'Atualizar Dados Bancários',
  'Modificar informações bancárias para pagamento', 'Gestão de Profissionais',
  true),
  ('/profissionais/:id/empresa-contrato', 'PUT', 'Atualizar Dados Empresa',
  'Modificar informações da empresa/CNPJ', 'Gestão de Profissionais', true),
  ('/profissionais/:id/servicos', 'PUT', 'Definir Serviços', 'Configurar serviços        
  que o profissional oferece', 'Gestão de Profissionais', true),
  ('/profissionais/:id/comprovante-endereco', 'DELETE', 'Remover Comprovante
  Endereço', 'Excluir arquivo de comprovante de endereço', 'Gestão de
  Profissionais', true),
  ('/profissionais/:id/comprovante-registro', 'DELETE', 'Remover Comprovante
  Registro', 'Excluir arquivo de comprovante de registro profissional', 'Gestão de       
  Profissionais', true),
  ('/profissionais/:id/comprovante-bancario', 'DELETE', 'Remover Comprovante
  Bancário', 'Excluir arquivo de comprovante bancário', 'Gestão de Profissionais',       
  true),

  -- Módulo: Gestão de Pacientes
  ('/pacientes', 'POST', 'Cadastrar Paciente', 'Adicionar novos pacientes à
  clínica', 'Gestão de Pacientes', true),
  ('/pacientes', 'GET', 'Listar Pacientes', 'Ver todos os pacientes cadastrados',        
  'Gestão de Pacientes', true),
  ('/pacientes/:id', 'PUT', 'Editar Paciente', 'Modificar informações dos
  pacientes', 'Gestão de Pacientes', true),
  ('/pacientes/:id', 'DELETE', 'Excluir Paciente', 'Remover paciente do sistema',        
  'Gestão de Pacientes', true),

  -- Módulo: Agendamentos
  ('/agendamentos', 'POST', 'Criar Agendamento', 'Agendar consultas e
  procedimentos', 'Agendamentos', true),
  ('/agendamentos', 'GET', 'Listar Agendamentos', 'Ver todos os agendamentos da
  clínica', 'Agendamentos', true),
  ('/agendamentos/:id', 'PUT', 'Editar Agendamento', 'Modificar agendamentos
  existentes', 'Agendamentos', true),
  ('/agendamentos/:id', 'DELETE', 'Cancelar Agendamento', 'Cancelar agendamento
  específico', 'Agendamentos', true),

  -- Módulo: Serviços e Especialidades
  ('/servicos', 'POST', 'Cadastrar Serviço', 'Adicionar novos serviços oferecidos',      
  'Serviços', true),
  ('/servicos', 'GET', 'Listar Serviços', 'Ver todos os serviços disponíveis',
  'Serviços', true),
  ('/servicos/:id', 'PUT', 'Editar Serviço', 'Modificar informações dos serviços',       
  'Serviços', true),
  ('/servicos/:id', 'DELETE', 'Excluir Serviço', 'Remover serviço do catálogo',
  'Serviços', true),

  ('/especialidades', 'POST', 'Cadastrar Especialidade', 'Adicionar novas
  especialidades médicas', 'Especialidades', true),
  ('/especialidades', 'GET', 'Listar Especialidades', 'Ver todas as especialidades       
  disponíveis', 'Especialidades', true),
  ('/especialidades/:id', 'PUT', 'Editar Especialidade', 'Modificar informações das      
  especialidades', 'Especialidades', true),
  ('/especialidades/:id', 'DELETE', 'Excluir Especialidade', 'Remover especialidade      
  do sistema', 'Especialidades', true),

  -- Módulo: Recursos da Clínica
  ('/recursos', 'POST', 'Cadastrar Recurso', 'Adicionar equipamentos e salas
  disponíveis', 'Recursos', true),
  ('/recursos', 'GET', 'Listar Recursos', 'Ver todos os recursos da clínica',
  'Recursos', true),
  ('/recursos/:id', 'PUT', 'Editar Recurso', 'Modificar informações dos recursos',       
  'Recursos', true),
  ('/recursos/:id', 'DELETE', 'Excluir Recurso', 'Remover recurso do sistema',
  'Recursos', true),

  -- Módulo: Convênios
  ('/convenios', 'POST', 'Cadastrar Convênio', 'Adicionar convênios aceitos pela
  clínica', 'Convênios', true),
  ('/convenios', 'GET', 'Listar Convênios', 'Ver todos os convênios cadastrados',        
  'Convênios', true),
  ('/convenios/:id', 'PUT', 'Editar Convênio', 'Modificar informações dos
  convênios', 'Convênios', true),
  ('/convenios/:id', 'DELETE', 'Excluir Convênio', 'Remover convênio do sistema',        
  'Convênios', true),

  -- Módulo: Gestão Financeira
  ('/precos-particulares', 'POST', 'Definir Preço Particular', 'Estabelecer preços       
  especiais para pacientes', 'Gestão Financeira', true),
  ('/precos-particulares', 'GET', 'Listar Preços Particulares', 'Ver preços
  especiais configurados', 'Gestão Financeira', true),
  ('/precos-particulares/:id', 'PUT', 'Editar Preço Particular', 'Modificar preços       
  especiais', 'Gestão Financeira', true),
  ('/precos-particulares/:id', 'DELETE', 'Remover Preço Particular', 'Excluir preço      
  especial configurado', 'Gestão Financeira', true),

  ('/precos-servicos-profissionais', 'POST', 'Definir Comissão', 'Estabelecer
  valores de comissão por serviço', 'Gestão Financeira', true),
  ('/precos-servicos-profissionais', 'GET', 'Listar Comissões', 'Ver comissões
  configuradas', 'Gestão Financeira', true),
  ('/precos-servicos-profissionais/:id', 'PUT', 'Editar Comissão', 'Modificar
  valores de comissão', 'Gestão Financeira', true),
  ('/precos-servicos-profissionais/:id', 'DELETE', 'Remover Comissão', 'Excluir
  configuração de comissão', 'Gestão Financeira', true),

  -- Módulo: Contratos e Documentos
  ('/contratos-profissionais', 'POST', 'Criar Contrato', 'Gerar contratos para
  profissionais', 'Contratos', true),
  ('/contratos-profissionais', 'GET', 'Listar Contratos', 'Ver todos os contratos        
  cadastrados', 'Contratos', true),
  ('/contratos-profissionais/:id', 'PUT', 'Editar Contrato', 'Modificar contratos        
  existentes', 'Contratos', true),
  ('/contratos-profissionais/:id', 'DELETE', 'Excluir Contrato', 'Remover contrato       
  do sistema', 'Contratos', true),

  ('/adendos-contratos', 'POST', 'Criar Adendo', 'Adicionar adendos aos contratos',      
  'Contratos', true),
  ('/adendos-contratos', 'GET', 'Listar Adendos', 'Ver adendos dos contratos',
  'Contratos', true),
  ('/adendos-contratos/:id', 'PUT', 'Editar Adendo', 'Modificar adendos existentes',     
   'Contratos', true),
  ('/adendos-contratos/:id', 'DELETE', 'Excluir Adendo', 'Remover adendo do
  contrato', 'Contratos', true),

  -- Módulo: Arquivos e Anexos
  ('/anexos', 'POST', 'Enviar Arquivo', 'Fazer upload de documentos e arquivos',
  'Gestão de Arquivos', true),
  ('/anexos', 'GET', 'Listar Arquivos', 'Ver todos os arquivos armazenados', 'Gestão     
   de Arquivos', true),
  ('/anexos/:id', 'PUT', 'Editar Arquivo', 'Modificar informações do arquivo',
  'Gestão de Arquivos', true),
  ('/anexos/:id', 'DELETE', 'Excluir Arquivo', 'Remover arquivo permanentemente',        
  'Gestão de Arquivos', true),

  -- Módulo: Disponibilidade e Agenda
  ('/disponibilidades-profissionais', 'POST', 'Definir Disponibilidade', 'Configurar     
   horários disponíveis dos profissionais', 'Agenda', true),
  ('/disponibilidades-profissionais', 'GET', 'Ver Disponibilidades', 'Consultar
  horários disponíveis', 'Agenda', true),
  ('/disponibilidades-profissionais/:id', 'PUT', 'Editar Disponibilidade',
  'Modificar horários disponíveis', 'Agenda', true),
  ('/disponibilidades-profissionais/:id', 'DELETE', 'Remover Disponibilidade',
  'Excluir horário disponível', 'Agenda', true),

  -- Módulo: Evolução Clínica
  ('/evolucoes', 'POST', 'Registrar Evolução', 'Documentar evolução do paciente',        
  'Evolução Clínica', true),
  ('/evolucoes', 'GET', 'Ver Evoluções', 'Consultar histórico de evoluções',
  'Evolução Clínica', true),
  ('/evolucoes/:id', 'PUT', 'Editar Evolução', 'Modificar registro de evolução',
  'Evolução Clínica', true),
  ('/evolucoes/:id', 'DELETE', 'Excluir Evolução', 'Remover registro de evolução',       
  'Evolução Clínica', true),

  -- Módulo: Configurações do Sistema
  ('/bancos', 'POST', 'Cadastrar Banco', 'Adicionar novos bancos ao sistema',
  'Configurações', true),
  ('/bancos', 'GET', 'Listar Bancos', 'Ver bancos cadastrados no sistema',
  'Configurações', true),
  ('/bancos/:id', 'PUT', 'Editar Banco', 'Modificar informações do banco',
  'Configurações', true),
  ('/bancos/:id', 'DELETE', 'Excluir Banco', 'Remover banco do sistema',
  'Configurações', true),

  ('/conselhos', 'POST', 'Cadastrar Conselho', 'Adicionar conselhos profissionais',      
  'Configurações', true),
  ('/conselhos', 'GET', 'Listar Conselhos', 'Ver conselhos profissionais
  cadastrados', 'Configurações', true),
  ('/conselhos/:id', 'PUT', 'Editar Conselho', 'Modificar dados do conselho
  profissional', 'Configurações', true),
  ('/conselhos/:id', 'DELETE', 'Excluir Conselho', 'Remover conselho do sistema',        
  'Configurações', true),

  -- Módulo: Relatórios e Consultas
  ('/profissionais-servicos', 'GET', 'Consultar Serviços do Profissional', 'Ver
  serviços associados ao profissional', 'Relatórios', true),
  ('/profissionais-servicos/:id', 'GET', 'Detalhes do Serviço', 'Ver detalhes
  específicos do serviço', 'Relatórios', true),
  ('/profissionais/:profissionalId/servicos-convenios', 'GET', 'Serviços por
  Convênio', 'Ver serviços do profissional por convênio', 'Relatórios', true);