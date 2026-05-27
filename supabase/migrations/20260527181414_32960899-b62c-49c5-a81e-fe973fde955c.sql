-- Negar acesso a Broadcast/Presence via realtime.messages para usuários comuns.
-- Não afeta postgres_changes, que respeita a RLS das tabelas de origem.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_messages_staff_only_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_messages_staff_only_insert" ON realtime.messages;

CREATE POLICY "realtime_messages_staff_only_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "realtime_messages_staff_only_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));