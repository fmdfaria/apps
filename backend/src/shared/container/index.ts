import { container } from 'tsyringe';
import { prisma } from '../database/prisma';
// import './providers';

import { IEspecialidadesRepository } from '../../core/domain/repositories/IEspecialidadesRepository';
import { PrismaEspecialidadesRepository } from '../../infra/database/prisma/repositories/PrismaEspecialidadesRepository';
import { IConselhosProfissionaisRepository } from '../../core/domain/repositories/IConselhosProfissionaisRepository';
import { PrismaConselhosProfissionaisRepository } from '../../infra/database/prisma/repositories/PrismaConselhosProfissionaisRepository';
import { IServicosRepository } from '../../core/domain/repositories/IServicosRepository';
import { PrismaServicosRepository } from '../../infra/database/prisma/repositories/PrismaServicosRepository';
import { IConveniosRepository } from '../../core/domain/repositories/IConveniosRepository';
import { PrismaConveniosRepository } from '../../infra/database/prisma/repositories/PrismaConveniosRepository';
import { IPacientesRepository } from '../../core/domain/repositories/IPacientesRepository';
import { PrismaPacientesRepository } from '../../infra/database/prisma/repositories/PrismaPacientesRepository';
import { IRecursosRepository } from '../../core/domain/repositories/IRecursosRepository';
import { PrismaRecursosRepository } from '../../infra/database/prisma/repositories/PrismaRecursosRepository';
import { IProfissionaisRepository } from '../../core/domain/repositories/IProfissionaisRepository';
import { PrismaProfissionaisRepository } from '../../infra/database/prisma/repositories/PrismaProfissionaisRepository';
import { IPrecosServicosProfissionaisRepository } from '../../core/domain/repositories/IPrecosServicosProfissionaisRepository';
import { PrismaPrecosServicosProfissionaisRepository } from '../../infra/database/prisma/repositories/PrismaPrecosServicosProfissionaisRepository';
import { CreatePrecoServicoProfissionalUseCase } from '../../core/application/use-cases/precos-servicos-profissionais/CreatePrecoServicoProfissionalUseCase';
import { UpdatePrecoServicoProfissionalUseCase } from '../../core/application/use-cases/precos-servicos-profissionais/UpdatePrecoServicoProfissionalUseCase';
import { ListPrecosServicosProfissionaisUseCase } from '../../core/application/use-cases/precos-servicos-profissionais/ListPrecosServicosProfissionaisUseCase';
import { DeletePrecoServicoProfissionalUseCase } from '../../core/application/use-cases/precos-servicos-profissionais/DeletePrecoServicoProfissionalUseCase';

import { IPrecosParticularesRepository } from '../../core/domain/repositories/IPrecosParticularesRepository';
import { PrismaPrecosParticularesRepository } from '../../infra/database/prisma/repositories/PrismaPrecosParticularesRepository';
import { CreatePrecoParticularUseCase } from '../../core/application/use-cases/precos-particulares/CreatePrecoParticularUseCase';
import { UpdatePrecoParticularUseCase } from '../../core/application/use-cases/precos-particulares/UpdatePrecoParticularUseCase';
import { ListPrecosParticularesUseCase } from '../../core/application/use-cases/precos-particulares/ListPrecosParticularesUseCase';
import { DeletePrecoParticularUseCase } from '../../core/application/use-cases/precos-particulares/DeletePrecoParticularUseCase';

import { IDisponibilidadesProfissionaisRepository } from '../../core/domain/repositories/IDisponibilidadesProfissionaisRepository';
import { PrismaDisponibilidadesProfissionaisRepository } from '../../infra/database/prisma/repositories/PrismaDisponibilidadesProfissionaisRepository';
import { CreateDisponibilidadeProfissionalUseCase } from '../../core/application/use-cases/disponibilidade-profissional/CreateDisponibilidadeProfissionalUseCase';
import { UpdateDisponibilidadeProfissionalUseCase } from '../../core/application/use-cases/disponibilidade-profissional/UpdateDisponibilidadeProfissionalUseCase';
import { ListDisponibilidadesProfissionaisUseCase } from '../../core/application/use-cases/disponibilidade-profissional/ListDisponibilidadesProfissionaisUseCase';
import { DeleteDisponibilidadeProfissionalUseCase } from '../../core/application/use-cases/disponibilidade-profissional/DeleteDisponibilidadeProfissionalUseCase';

import { IContratosProfissionaisRepository } from '../../core/domain/repositories/IContratosProfissionaisRepository';
import { PrismaContratosProfissionaisRepository } from '../../infra/database/prisma/repositories/PrismaContratosProfissionaisRepository';
import { CreateContratoProfissionalUseCase } from '../../core/application/use-cases/contrato-profissional/CreateContratoProfissionalUseCase';
import { UpdateContratoProfissionalUseCase } from '../../core/application/use-cases/contrato-profissional/UpdateContratoProfissionalUseCase';
import { ListContratosProfissionaisUseCase } from '../../core/application/use-cases/contrato-profissional/ListContratosProfissionaisUseCase';
import { DeleteContratoProfissionalUseCase } from '../../core/application/use-cases/contrato-profissional/DeleteContratoProfissionalUseCase';

import { IAdendosContratosRepository } from '../../core/domain/repositories/IAdendosContratosRepository';
import { PrismaAdendosContratosRepository } from '../../infra/database/prisma/repositories/PrismaAdendosContratosRepository';
import { CreateAdendoContratoUseCase } from '../../core/application/use-cases/adendo-contrato/CreateAdendoContratoUseCase';
import { UpdateAdendoContratoUseCase } from '../../core/application/use-cases/adendo-contrato/UpdateAdendoContratoUseCase';
import { ListAdendosContratosUseCase } from '../../core/application/use-cases/adendo-contrato/ListAdendosContratosUseCase';
import { DeleteAdendoContratoUseCase } from '../../core/application/use-cases/adendo-contrato/DeleteAdendoContratoUseCase';

import { IAnexosRepository } from '../../core/domain/repositories/IAnexosRepository';
import { PrismaAnexosRepository } from '../../infra/database/prisma/repositories/PrismaAnexosRepository';
import { CreateAnexoUseCase } from '../../core/application/use-cases/anexo/CreateAnexoUseCase';
import { ListAnexosUseCase } from '../../core/application/use-cases/anexo/ListAnexosUseCase';
import { DeleteAnexoUseCase } from '../../core/application/use-cases/anexo/DeleteAnexoUseCase';
import { UpdateAnexoUseCase } from '../../core/application/use-cases/anexo/UpdateAnexoUseCase';

import { IAgendamentosRepository } from '../../core/domain/repositories/IAgendamentosRepository';
import { PrismaAgendamentosRepository } from '../../infra/database/prisma/repositories/PrismaAgendamentosRepository';
import { CreateAgendamentoUseCase } from '../../core/application/use-cases/agendamento/CreateAgendamentoUseCase';
import { ListAgendamentosUseCase } from '../../core/application/use-cases/agendamento/ListAgendamentosUseCase';
import { UpdateAgendamentoUseCase } from '../../core/application/use-cases/agendamento/UpdateAgendamentoUseCase';
import { DeleteAgendamentoUseCase } from '../../core/application/use-cases/agendamento/DeleteAgendamentoUseCase';

import { PrismaEvolucoesPacientesRepository } from '../../infra/database/prisma/repositories/PrismaEvolucoesPacientesRepository';
import { IEvolucoesPacientesRepository } from '../../core/domain/repositories/IEvolucoesPacientesRepository';
import { IPacientesPedidosRepository } from '../../core/domain/repositories/IPacientesPedidosRepository';
import { PrismaPacientesPedidosRepository } from '../../infra/database/prisma/repositories/PrismaPacientesPedidosRepository';
import { CreatePacientePedidoUseCase } from '../../core/application/use-cases/paciente-pedido/CreatePacientePedidoUseCase';
import { ListPacientesPedidosUseCase } from '../../core/application/use-cases/paciente-pedido/ListPacientesPedidosUseCase';
import { UpdatePacientePedidoUseCase } from '../../core/application/use-cases/paciente-pedido/UpdatePacientePedidoUseCase';
import { DeletePacientePedidoUseCase } from '../../core/application/use-cases/paciente-pedido/DeletePacientePedidoUseCase';

import { IFilaEsperaRepository } from '../../core/domain/repositories/IFilaEsperaRepository';
import { PrismaFilaEsperaRepository } from '../../infra/database/prisma/repositories/PrismaFilaEsperaRepository';
import { CreateFilaEsperaUseCase } from '../../core/application/use-cases/fila-espera/CreateFilaEsperaUseCase';
import { ListFilaEsperaUseCase } from '../../core/application/use-cases/fila-espera/ListFilaEsperaUseCase';
import { UpdateFilaEsperaUseCase } from '../../core/application/use-cases/fila-espera/UpdateFilaEsperaUseCase';
import { DeleteFilaEsperaUseCase } from '../../core/application/use-cases/fila-espera/DeleteFilaEsperaUseCase';
import { UpdateFilaEsperaStatusUseCase } from '../../core/application/use-cases/fila-espera/UpdateFilaEsperaStatusUseCase';

import { IUsersRepository } from '../../core/domain/repositories/IUsersRepository';
import { PrismaUsersRepository } from '../../infra/database/prisma/repositories/PrismaUsersRepository';
import { IRefreshTokensRepository } from '../../core/domain/repositories/IRefreshTokensRepository';
import { PrismaRefreshTokensRepository } from '../../infra/database/prisma/repositories/PrismaRefreshTokensRepository';

import { IBancosRepository } from '../../core/domain/repositories/IBancosRepository';
import { PrismaBancosRepository } from '../../infra/database/prisma/repositories/PrismaBancosRepository';
import { CreateBancoUseCase } from '../../core/application/use-cases/banco/CreateBancoUseCase';
import { ListBancosUseCase } from '../../core/application/use-cases/banco/ListBancosUseCase';
import { UpdateBancoUseCase } from '../../core/application/use-cases/banco/UpdateBancoUseCase';
import { DeleteBancoUseCase } from '../../core/application/use-cases/banco/DeleteBancoUseCase';

// RBAC Imports
import { IRolesRepository } from '../../core/domain/repositories/IRolesRepository';
import { PrismaRolesRepository } from '../../infra/database/prisma/repositories/PrismaRolesRepository';
import { IRoutesRepository } from '../../core/domain/repositories/IRoutesRepository';
import { PrismaRoutesRepository } from '../../infra/database/prisma/repositories/PrismaRoutesRepository';
import { IUserRolesRepository } from '../../core/domain/repositories/IUserRolesRepository';
import { PrismaUserRolesRepository } from '../../infra/database/prisma/repositories/PrismaUserRolesRepository';
import { IRoleRoutesRepository } from '../../core/domain/repositories/IRoleRoutesRepository';
import { PrismaRoleRoutesRepository } from '../../infra/database/prisma/repositories/PrismaRoleRoutesRepository';

// RBAC Use Cases
import { CreateRoleUseCase } from '../../core/application/use-cases/role/CreateRoleUseCase';
import { ListRolesUseCase } from '../../core/application/use-cases/role/ListRolesUseCase';
import { UpdateRoleUseCase } from '../../core/application/use-cases/role/UpdateRoleUseCase';
import { DeleteRoleUseCase } from '../../core/application/use-cases/role/DeleteRoleUseCase';
import { CreateRouteUseCase } from '../../core/application/use-cases/route/CreateRouteUseCase';
import { ListRoutesUseCase } from '../../core/application/use-cases/route/ListRoutesUseCase';
import { UpdateRouteUseCase } from '../../core/application/use-cases/route/UpdateRouteUseCase';
import { DeleteRouteUseCase } from '../../core/application/use-cases/route/DeleteRouteUseCase';
import { AssignRoleToUserUseCase } from '../../core/application/use-cases/user-role/AssignRoleToUserUseCase';
import { ListUserRolesUseCase } from '../../core/application/use-cases/user-role/ListUserRolesUseCase';
import { RemoveRoleFromUserUseCase } from '../../core/application/use-cases/user-role/RemoveRoleFromUserUseCase';
import { UpdateUserRoleUseCase } from '../../core/application/use-cases/user-role/UpdateUserRoleUseCase';
import { ListAllUserRolesUseCase } from '../../core/application/use-cases/user-role/ListAllUserRolesUseCase';
import { AssignRouteToRoleUseCase } from '../../core/application/use-cases/role-route/AssignRouteToRoleUseCase';
import { RemoveRouteFromRoleUseCase } from '../../core/application/use-cases/role-route/RemoveRouteFromRoleUseCase';
import { ListUserAllowedRoutesUseCase } from '../../core/application/use-cases/role-route/ListUserAllowedRoutesUseCase';
import { ListAllRoleRoutesUseCase } from '../../core/application/use-cases/role-route/ListAllRoleRoutesUseCase';
import { UpdateRoleRouteUseCase } from '../../core/application/use-cases/role-route/UpdateRoleRouteUseCase';
import { DeleteRoleRouteUseCase } from '../../core/application/use-cases/role-route/DeleteRoleRouteUseCase';

container.registerInstance('PrismaClient', prisma);

container.register<IEspecialidadesRepository>(
  'EspecialidadesRepository',
  PrismaEspecialidadesRepository
);

container.register<IConselhosProfissionaisRepository>(
  'ConselhosProfissionaisRepository',
  PrismaConselhosProfissionaisRepository
);

container.register<IServicosRepository>(
  'ServicosRepository',
  PrismaServicosRepository
);

container.register<IConveniosRepository>(
  'ConveniosRepository',
  PrismaConveniosRepository
);

container.register<IPacientesRepository>(
  'PacientesRepository',
  PrismaPacientesRepository
);

container.register<IRecursosRepository>(
  'RecursosRepository',
  PrismaRecursosRepository
);

container.register<IProfissionaisRepository>(
  'ProfissionaisRepository',
  PrismaProfissionaisRepository
);

container.registerSingleton<IPrecosServicosProfissionaisRepository>(
  'PrecosServicosProfissionaisRepository',
  PrismaPrecosServicosProfissionaisRepository
);

container.register(
  'CreatePrecoServicoProfissionalUseCase',
  CreatePrecoServicoProfissionalUseCase
);
container.register(
  'UpdatePrecoServicoProfissionalUseCase',
  UpdatePrecoServicoProfissionalUseCase
);
container.register(
  'ListPrecosServicosProfissionaisUseCase',
  ListPrecosServicosProfissionaisUseCase
);
container.register(
  'DeletePrecoServicoProfissionalUseCase',
  DeletePrecoServicoProfissionalUseCase
);

container.registerSingleton<IPrecosParticularesRepository>(
  'PrecosParticularesRepository',
  PrismaPrecosParticularesRepository
);

container.register('CreatePrecoParticularUseCase', CreatePrecoParticularUseCase);
container.register('UpdatePrecoParticularUseCase', UpdatePrecoParticularUseCase);
container.register('ListPrecosParticularesUseCase', ListPrecosParticularesUseCase);
container.register('DeletePrecoParticularUseCase', DeletePrecoParticularUseCase);

container.registerSingleton<IDisponibilidadesProfissionaisRepository>(
  'DisponibilidadesProfissionaisRepository',
  PrismaDisponibilidadesProfissionaisRepository
);

container.register('CreateDisponibilidadeProfissionalUseCase', CreateDisponibilidadeProfissionalUseCase);
container.register('UpdateDisponibilidadeProfissionalUseCase', UpdateDisponibilidadeProfissionalUseCase);
container.register('ListDisponibilidadesProfissionaisUseCase', ListDisponibilidadesProfissionaisUseCase);
container.register('DeleteDisponibilidadeProfissionalUseCase', DeleteDisponibilidadeProfissionalUseCase);

container.registerSingleton<IContratosProfissionaisRepository>(
  'ContratosProfissionaisRepository',
  PrismaContratosProfissionaisRepository
);

container.register('CreateContratoProfissionalUseCase', CreateContratoProfissionalUseCase);
container.register('UpdateContratoProfissionalUseCase', UpdateContratoProfissionalUseCase);
container.register('ListContratosProfissionaisUseCase', ListContratosProfissionaisUseCase);
container.register('DeleteContratoProfissionalUseCase', DeleteContratoProfissionalUseCase);

container.registerSingleton<IAdendosContratosRepository>(
  'AdendosContratosRepository',
  PrismaAdendosContratosRepository
);

container.register('CreateAdendoContratoUseCase', CreateAdendoContratoUseCase);
container.register('UpdateAdendoContratoUseCase', UpdateAdendoContratoUseCase);
container.register('ListAdendosContratosUseCase', ListAdendosContratosUseCase);
container.register('DeleteAdendoContratoUseCase', DeleteAdendoContratoUseCase);

container.registerSingleton<IAnexosRepository>(
  'AnexosRepository',
  PrismaAnexosRepository
);

container.register('CreateAnexoUseCase', CreateAnexoUseCase);
container.register('ListAnexosUseCase', ListAnexosUseCase);
container.register('DeleteAnexoUseCase', DeleteAnexoUseCase);
container.register('UpdateAnexoUseCase', UpdateAnexoUseCase);

container.registerSingleton<IAgendamentosRepository>(
  'AgendamentosRepository',
  PrismaAgendamentosRepository
);
container.register('CreateAgendamentoUseCase', CreateAgendamentoUseCase);
container.register('ListAgendamentosUseCase', ListAgendamentosUseCase);
container.register('UpdateAgendamentoUseCase', UpdateAgendamentoUseCase);
container.register('DeleteAgendamentoUseCase', DeleteAgendamentoUseCase);

container.registerSingleton<IEvolucoesPacientesRepository>('EvolucoesPacientesRepository', PrismaEvolucoesPacientesRepository);

container.registerSingleton<IPacientesPedidosRepository>('PacientesPedidosRepository', PrismaPacientesPedidosRepository);

container.register('CreatePacientePedidoUseCase', CreatePacientePedidoUseCase);
container.register('ListPacientesPedidosUseCase', ListPacientesPedidosUseCase);
container.register('UpdatePacientePedidoUseCase', UpdatePacientePedidoUseCase);
container.register('DeletePacientePedidoUseCase', DeletePacientePedidoUseCase);

container.registerSingleton<IFilaEsperaRepository>('FilaEsperaRepository', PrismaFilaEsperaRepository);
container.register('CreateFilaEsperaUseCase', CreateFilaEsperaUseCase);
container.register('ListFilaEsperaUseCase', ListFilaEsperaUseCase);
container.register('UpdateFilaEsperaUseCase', UpdateFilaEsperaUseCase);
container.register('DeleteFilaEsperaUseCase', DeleteFilaEsperaUseCase);
container.register('UpdateFilaEsperaStatusUseCase', UpdateFilaEsperaStatusUseCase);

container.registerSingleton<IUsersRepository>(
  'UsersRepository',
  PrismaUsersRepository
);

container.registerSingleton<IRefreshTokensRepository>(
  'RefreshTokensRepository',
  PrismaRefreshTokensRepository
);

container.registerSingleton<IBancosRepository>(
  'BancosRepository',
  PrismaBancosRepository
);

container.register('CreateBancoUseCase', CreateBancoUseCase);
container.register('ListBancosUseCase', ListBancosUseCase);
container.register('UpdateBancoUseCase', UpdateBancoUseCase);
container.register('DeleteBancoUseCase', DeleteBancoUseCase);

// RBAC Repositories
container.register<IRolesRepository>(
  'RolesRepository',
  PrismaRolesRepository
);

container.register<IRoutesRepository>(
  'RoutesRepository',
  PrismaRoutesRepository
);

container.register<IUserRolesRepository>(
  'UserRolesRepository',
  PrismaUserRolesRepository
);

container.register<IRoleRoutesRepository>(
  'RoleRoutesRepository',
  PrismaRoleRoutesRepository
);

// RBAC Use Cases
container.register('CreateRoleUseCase', CreateRoleUseCase);
container.register('ListRolesUseCase', ListRolesUseCase);
container.register('UpdateRoleUseCase', UpdateRoleUseCase);
container.register('DeleteRoleUseCase', DeleteRoleUseCase);

container.register('CreateRouteUseCase', CreateRouteUseCase);
container.register('ListRoutesUseCase', ListRoutesUseCase);
container.register('UpdateRouteUseCase', UpdateRouteUseCase);
container.register('DeleteRouteUseCase', DeleteRouteUseCase);

container.register('AssignRoleToUserUseCase', AssignRoleToUserUseCase);
container.register('ListUserRolesUseCase', ListUserRolesUseCase);
container.register('RemoveRoleFromUserUseCase', RemoveRoleFromUserUseCase);
container.register('UpdateUserRoleUseCase', UpdateUserRoleUseCase);
container.register('ListAllUserRolesUseCase', ListAllUserRolesUseCase);

container.register('AssignRouteToRoleUseCase', AssignRouteToRoleUseCase);
container.register('RemoveRouteFromRoleUseCase', RemoveRouteFromRoleUseCase);
container.register('ListUserAllowedRoutesUseCase', ListUserAllowedRoutesUseCase);
container.register('ListAllRoleRoutesUseCase', ListAllRoleRoutesUseCase);
container.register('UpdateRoleRouteUseCase', UpdateRoleRouteUseCase);
container.register('DeleteRoleRouteUseCase', DeleteRoleRouteUseCase);