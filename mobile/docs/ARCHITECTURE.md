# CRM Premium Template

## 5 pilares aplicados
1. **Design system**: tokens, primitives, motion e escala de componentes centralizados.
2. **Navegacao**: Expo Router com auth, tabs, stack de detalhe e modal de acao rapida.
3. **Microinteracoes**: toque, hover/focus web, bottom sheet e transicoes com Reanimated.
4. **Hierarquia visual**: headers consistentes, cards com prioridade e blocos bem definidos.
5. **Consistencia de comportamento**: estados de loading/vazio/erro/sucesso padronizados.

## Estrutura
```text
app/
  (auth)/
  (tabs)/
  leads/[id].tsx
  customers/[id].tsx
  modals/quick-actions.tsx
src/
  components/
    ui/
    crm/
    layout/
    feedback/
  features/
    auth/
    dashboard/
    leads/
    customers/
    agenda/
    more/
    shared/
  navigation/
  providers/
  theme/
  types/
```

## Contratos centrais
- Tema base unico em `src/theme/primitives.json`.
- Tokens de runtime em `src/theme/tokens.ts`.
- Tailwind lendo o mesmo source em `tailwind.config.js`.
- Rotas centralizadas em `src/navigation/routes.ts`.
- Tipos de status centralizados em `src/types/status.ts`.

## Regras de escala
- Nao criar cor/spacing inline em telas; usar tokens/classes semanticas.
- Nao usar string literal de rota em telas; usar `routes`.
- Toda lista deve prever loading, vazio, erro e sem resultado.
- Detalhes abrem em stack; filtros em `BottomSheet`; acao rapida em modal.
- Um CTA principal por tela; acoes secundarias com menor destaque.
- Reusar componentes base antes de criar novos.

## Componentes base prontos
- UI: `Button`, `Input`, `Select`, `Chip`, `Card`, `AppScreen`, `AppText`, `BottomSheet`
- CRM: `SearchBar`, `StatusBadge`, `ListItem`, `Avatar`, `KpiCard`, `MenuItem`
- Feedback: `EmptyState`, `ErrorState`, `SkeletonBlock`, `ToastProvider`
- Layout: `PageHeader`, `AnimatedSection`

## Navegacao inicial CRM
- Tabs: Home, Leads, Clientes, Agenda, Mais
- Mais: Tarefas, Financeiro, Notificacoes, Configuracoes
- Modal: Acoes rapidas

## Scripts
- `npm run start`
- `npm run typecheck`
