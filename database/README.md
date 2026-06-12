# Database deployment

1. Back up the Supabase database.
2. For a new database, execute `schema.sql`.
3. Execute `migrations/*.sql` in numeric order.
4. Keep the backend offline while applying migrations that alter active tables.
5. Start one backend instance and verify `/api/health`.
6. Verify that `anon` and `authenticated` have no direct table/function grants.

The service-role key bypasses RLS and must exist only in backend environment
variables. Migrations are additive and preserve existing sensor and alert rows.

Retention is executed hourly by the backend through `cg_cleanup_retention`.
For stronger scheduling guarantees, call the same function from Supabase Cron.
