# -*- coding: utf-8 -*-
"""
Diagnostico e correcao automatica de permissoes PostgreSQL.
Execute com: python check_db.py
"""
import os
import sys
from urllib.parse import urlparse, unquote

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Le DATABASE_URL do .env
env_path = os.path.join(os.path.dirname(__file__), ".env")
db_url = None
for line in open(env_path, encoding='utf-8'):
    line = line.strip()
    if line.startswith("DATABASE_URL="):
        db_url = line.split("=", 1)[1]
        break

if not db_url:
    print("ERRO: DATABASE_URL nao encontrada no .env")
    sys.exit(1)

parsed = urlparse(db_url)
current_user = parsed.username
host = parsed.hostname
port = parsed.port or 5432
dbname = parsed.path.lstrip("/")
password = unquote(parsed.password or "")

print("=" * 60)
print("DIAGNOSTICO DE PERMISSOES POSTGRESQL")
print("=" * 60)
print(f"Host:    {host}:{port}")
print(f"Banco:   {dbname}")
print(f"Usuario: {current_user}")
print()

try:
    import psycopg2
except ImportError:
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2

try:
    conn = psycopg2.connect(
        host=host, port=port, dbname=dbname,
        user=current_user, password=password,
        connect_timeout=10,
    )
    conn.autocommit = True
    cur = conn.cursor()
    print("[OK] Conexao estabelecida\n")
except Exception as e:
    print(f"[ERRO] Falha na conexao: {e}")
    sys.exit(1)

# 1. Info do usuario
cur.execute("SELECT current_user, session_user")
row = cur.fetchone()
print(f"Current user : {row[0]}")
print(f"Session user : {row[1]}")
print()

# 2. Tabelas e donos
cur.execute("""
    SELECT tablename, tableowner
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
""")
all_table_rows = cur.fetchall()
all_tables = {r[0] for r in all_table_rows}

print("-" * 55)
print(f"{'Tabela':<35} {'Owner'}")
print("-" * 55)
for tablename, owner in all_table_rows:
    flag = "(seu)" if owner == current_user else "[OUTRO OWNER]"
    print(f"{tablename:<35} {owner}  {flag}")
print()

# 3. Permissoes concedidas
cur.execute("""
    SELECT table_name,
           string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
    WHERE grantee = %s AND table_schema = 'public'
    GROUP BY table_name
    ORDER BY table_name
""", (current_user,))
rows = cur.fetchall()
granted_tables = {r[0] for r in rows}

print("-" * 55)
print(f"PERMISSOES DO USUARIO '{current_user}':")
print("-" * 55)
for tablename, privs in rows:
    print(f"  {tablename:<33} {privs}")
print()

missing = all_tables - granted_tables
if missing:
    print("[ATENCAO] Tabelas SEM permissao:")
    for t in sorted(missing):
        print(f"   - {t}")
    print()

# 4. Gerar script SQL
owners = {}
for tablename, owner in all_table_rows:
    owners.setdefault(owner, []).append(tablename)

print("=" * 60)
print("SCRIPT SQL PARA CORRECAO DE PERMISSOES")
print("(Execute como superusuario postgres/dba)")
print("=" * 60)
print()

for owner, tables in sorted(owners.items()):
    if owner != current_user:
        tbl_list = ", ".join(tables)
        print(f"-- Tabelas do owner '{owner}':")
        print(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {tbl_list}")
        print(f'TO "{current_user}";')
        print()

print(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public')
print(f'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "{current_user}";')
print()
print(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public')
print(f'GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO "{current_user}";')
print()

# 5. Teste direto nas tabelas criticas
print("-" * 55)
print("TESTE NAS TABELAS DA APLICACAO:")
critical = [
    "users", "banks", "brokers", "broker_groups", "proposals",
    "convenios", "products", "audit_logs", "blacklist_entries",
    "integrations", "pipeline_configs", "antifraud_rules", "antifraud_analyses"
]
all_ok = True
for t in critical:
    if t not in all_tables:
        print(f"  {t:<35} [NAO EXISTE]")
        continue
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        count = cur.fetchone()[0]
        print(f"  {t:<35} [OK] {count} registros")
    except Exception as e:
        msg = e.pgerror.strip() if hasattr(e, 'pgerror') and e.pgerror else str(e)
        print(f"  {t:<35} [ERRO] {msg}")
        all_ok = False
        conn.rollback()

cur.close()
conn.close()
print()
if all_ok:
    print("[OK] Banco pronto — todas as tabelas acessiveis.")
else:
    print("[ATENCAO] Algumas tabelas com erro.")
    print("Execute o script SQL acima como superusuario e rode novamente.")
