# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack clinic management system for Probotec Clinica with the following structure:

- **backend/**: Node.js API using Fastify, TypeScript, Prisma ORM, and Clean Architecture
- **frontend/**: React/TypeScript SPA using Vite, Tailwind CSS, and shadcn/ui components

## Architecture

### Backend Architecture (Clean Architecture)

The backend follows Clean Architecture patterns with:

- **Core/Domain**: Business entities and repository interfaces (`src/core/domain/`)
- **Use Cases**: Application business logic (`src/core/application/use-cases/`)
- **Infrastructure**: Data access and external services (`src/infra/`)
- **HTTP Layer**: Controllers, routes, and middlewares (`src/infra/http/`)

Key patterns:
- Dependency injection using TSyringe
- Repository pattern for data access
- Prisma as ORM with PostgreSQL
- JWT-based authentication with refresh tokens
- File uploads via Supabase Storage

### Frontend Architecture

The frontend uses:
- **Component-based architecture** with shadcn/ui design system
- **Radix UI + Tailwind CSS** for all UI components (no heavy UI libraries)
- **Zustand** for state management
- **React Query** for server state management
- **React Router DOM** for routing
- **Axios** for API communication

## Common Development Commands

### Backend Commands
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
```

### Frontend Commands  
```bash
cd frontend
npm run dev          # Start development server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Database

- **Database**: PostgreSQL via Prisma ORM
- **Schema**: Located at `backend/prisma/schema.prisma`
- **Migrations**: Managed by Prisma
- Key entities: Users, Profissionais, Pacientes, Agendamentos, Servicos, Especialidades, etc.

## API Reference

Comprehensive API documentation is available in:
- `backend/BACKEND_API_REFERENCE.md` - Complete endpoint documentation
- `frontend/backend.md` - Frontend-focused API guide

## Authentication & Authorization

- JWT-based auth with access/refresh token pattern
- User types: ADMIN, RECEPCIONISTA, PROFISSIONAL, PACIENTE
- Rate limiting on sensitive endpoints (login, password reset)
- Email confirmation and password reset flows (mocked)

## File Structure Conventions

### Frontend
- Components in `/src/components/` organized by feature
- UI components in `/src/components/ui/` (shadcn/ui pattern)
- API services in `/src/services/`
- Types in `/src/types/` matching backend entities
- Pages in `/src/pages/` organized by feature

### Backend
- Use cases follow pattern: `[Entity][Action]UseCase.ts`
- Controllers follow pattern: `[Entity]Controller.ts`
- Repositories use Prisma: `Prisma[Entity]Repository.ts`
- Routes follow pattern: `[entity].routes.ts`

## Code Quality Standards

Both projects include .cursorrules with extensive code quality guidelines focusing on:
- DRY principle and code deduplication
- TypeScript best practices
- React best practices and hooks
- Component structure and reusability
- Performance optimizations
- Accessibility (a11y)
- Proper error handling
- Testing strategies

## UI Design System

The frontend strictly follows:
- **Radix UI + Tailwind CSS** only (no MaterialUI, Ant Design, Chakra UI)
- shadcn/ui component patterns
- All UI components in `/src/components/ui/`
- Lucide React for icons
- Framer Motion for animations
- Consistent with lovable.dev design standards

## Testing

- Frontend: ESLint for code quality
- Backend: No test framework currently configured
- Both projects follow TypeScript strict mode

## Development Workflow

1. Backend runs on port 3333 (typical Fastify default)
2. Frontend runs on Vite dev server (typically port 5173)
3. API calls use axios with base URL configuration
4. Authentication state managed via Zustand store
5. File uploads handled via Supabase integration

## Agendamentos - AtenderPage

- Preciso criar uma nova coluna chamada 'data_atendimento' na tabela 'agendamentos' no banco de dados, então forneça um SQL para adicionar essa coluna.
- Essa nova coluna vai servir para registrar a 'Data do Atendimento' que está atualmente no put /agendamentos no Modal AtenderAgendamentoModal
- Atualizar o backend e frontend para atender a funcionalidade dessa nova coluna.