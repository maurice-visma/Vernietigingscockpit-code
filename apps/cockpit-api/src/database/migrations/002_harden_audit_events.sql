CREATE OR REPLACE FUNCTION prevent_audit_events_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is insert-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_events_update ON audit_events;
CREATE TRIGGER prevent_audit_events_update
BEFORE UPDATE ON audit_events
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_events_mutation();

DROP TRIGGER IF EXISTS prevent_audit_events_delete ON audit_events;
CREATE TRIGGER prevent_audit_events_delete
BEFORE DELETE ON audit_events
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_events_mutation();
