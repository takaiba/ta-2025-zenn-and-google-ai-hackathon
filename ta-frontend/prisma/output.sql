-- Detected 1 tables with tenant_id

--- Enable RLS on the KnowledgeGoogleDriveUser table
ALTER TABLE "KnowledgeGoogleDriveUser" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "KnowledgeGoogleDriveUser";
DROP POLICY IF EXISTS bypass_rls_policy ON "KnowledgeGoogleDriveUser";

--- Create a policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON "KnowledgeGoogleDriveUser"
    FOR ALL
    USING ("tenant_id" = current_setting('app.current_tenant_id'))
    WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id'));
---Create a bypass RLS policy (for admin purposes)
CREATE POLICY bypass_rls_policy ON "KnowledgeGoogleDriveUser"
    FOR ALL
    USING (current_setting('app.bypass_rls') = 'on')
    WITH CHECK (current_setting('app.bypass_rls') = 'on');
