-- SQL para adicionar nova rota /agendamentos-pendencias/:id ao sistema

-- 1. Inserir nova rota na tabela routes
INSERT INTO routes (path, method, nome, descricao, modulo, ativo) VALUES 
('/agendamentos-pendencias/:id', 'PUT', 'Resolver Pendência', 'Endpoint para voltar status de PENDENTE para ATENDIDO', 'agendamentos', true);

-- 2. Associar rota às roles que precisam dessa funcionalidade
-- Exemplo para role ADMIN
INSERT INTO role_routes (role_id, route_id)
SELECT r.id, rt.id
FROM roles r, routes rt
WHERE r.nome = 'ADMIN'
AND rt.path = '/agendamentos-pendencias/:id'
AND rt.method = 'PUT'
AND NOT EXISTS (
    SELECT 1 FROM role_routes rr 
    WHERE rr.role_id = r.id AND rr.route_id = rt.id
);

-- Exemplo para role RECEPCIONISTA (se necessário)
INSERT INTO role_routes (role_id, route_id)
SELECT r.id, rt.id
FROM roles r, routes rt
WHERE r.nome = 'RECEPCIONISTA'
AND rt.path = '/agendamentos-pendencias/:id'
AND rt.method = 'PUT'
AND NOT EXISTS (
    SELECT 1 FROM role_routes rr 
    WHERE rr.role_id = r.id AND rr.route_id = rt.id
);

-- Exemplo para role PROFISSIONAL (se necessário)
INSERT INTO role_routes (role_id, route_id)
SELECT r.id, rt.id
FROM roles r, routes rt
WHERE r.nome = 'PROFISSIONAL'
AND rt.path = '/agendamentos-pendencias/:id'
AND rt.method = 'PUT'
AND NOT EXISTS (
    SELECT 1 FROM role_routes rr 
    WHERE rr.role_id = r.id AND rr.route_id = rt.id
);

-- 3. Verificar se a rota foi inserida corretamente
SELECT r.nome as role_name, rt.path, rt.method, rt.nome as route_name
FROM roles r
JOIN role_routes rr ON r.id = rr.role_id
JOIN routes rt ON rr.route_id = rt.id
WHERE rt.path = '/agendamentos-pendencias/:id'
ORDER BY r.nome;