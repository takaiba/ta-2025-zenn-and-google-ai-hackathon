# TODO: コード生成系はprismaフォルダ直下に置きたくない（デフォルトのフォルダ・ファイルと見間違うため）ので、output.sql含め移動を検討する

# Python3で、schema.prismaを読み取って、Tenantテーブル以外のtenant_id blockがある部分から、テーブル名を検知して、以下のようにテンプレートコードをまとめた結果をoutput.mdに出力するコードを生成してください。
# なお、Accountテーブルの場合以下のテンプレートコードを生成してください。

# --- Enable RLS on the Account table
# ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

# DROP POLICY IF EXISTS tenant_isolation_policy ON "Account";
# DROP POLICY IF EXISTS bypass_rls_policy ON "Account";

# --- Create a policy for tenant isolation
# CREATE POLICY tenant_isolation_policy ON "Account"
#     FOR ALL
#     USING ("tenant_id" = current_setting('app.current_tenant_id'))
#     WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id'));
# ---Create a bypass RLS policy (for admin purposes)
# CREATE POLICY bypass_rls_policy ON "Account"
#     FOR ALL
#     USING (current_setting('app.bypass_rls') = 'on')
#     WITH CHECK (current_setting('app.bypass_rls') = 'on');

import re

def generate_template_code(table_name):
    return f"""
--- Enable RLS on the {table_name} table
ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "{table_name}";
DROP POLICY IF EXISTS bypass_rls_policy ON "{table_name}";

--- Create a policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON "{table_name}"
    FOR ALL
    USING ("tenant_id" = current_setting('app.current_tenant_id'))
    WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id'));
---Create a bypass RLS policy (for admin purposes)
CREATE POLICY bypass_rls_policy ON "{table_name}"
    FOR ALL
    USING (current_setting('app.bypass_rls') = 'on')
    WITH CHECK (current_setting('app.bypass_rls') = 'on');
"""

def generate_sql(tables):
    # デバッグログを生成
    debug_log = f"-- Detected {len(tables)} tables with tenant_id\n"

    # テンプレートコードを生成
    output = debug_log
    for table in tables:
        output += generate_template_code(table)

    # output.sqlに書き込み
    with open('output.sql', 'w') as file:
        file.write(output)

def main():
    with open('schema.prisma', 'r') as file:
        schema = file.read()

    # 正規表現でテーブル名を検出
    table_pattern = re.compile(r'model\s+(\w+)\s+{[^}]*tenant_id[^}]*}', re.DOTALL)
    tables = table_pattern.findall(schema)

    # Tenantテーブルを除外
    tables = [table for table in tables if table != 'Tenant']
    
    generate_sql(tables)

if __name__ == "__main__":
    main()
    
    # generate_sql([])

    
    # 手動でAcocuntテーブルのテンプレートコードを生成したいとき
    #  DifyApp
    generate_sql(['KnowledgeGoogleDriveUser'])
