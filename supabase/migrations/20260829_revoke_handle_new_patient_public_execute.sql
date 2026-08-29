-- handle_new_patient() is only ever meant to run via the on_auth_user_created
-- trigger, which doesn't require the triggering role to have EXECUTE on the
-- function (trigger firing is authorized by the trigger's existence on the
-- table, not by function grants). Revoking direct EXECUTE closes the
-- public RPC exposure (/rest/v1/rpc/handle_new_patient) with zero
-- functional risk — confirmed registration still works end-to-end after
-- this change.
revoke execute on function public.handle_new_patient() from public, anon, authenticated;
