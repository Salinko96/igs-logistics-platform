UPDATE "Case"
SET merchandise = 'Matériaux de construction',
    description = regexp_replace(coalesce(description, ''), 'cyanure', 'matériaux de construction', 'gi'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE lower(coalesce(merchandise, '')) LIKE '%cyanure%'
   OR lower(coalesce(description, '')) LIKE '%cyanure%';

UPDATE "Case"
SET status = CASE
  WHEN lower(status) IN ('assigne', 'assigné') THEN 'dossier_ouvert'
  WHEN lower(status) = 'en transit' THEN 'en_transit'
  WHEN lower(status) IN ('clôturé', 'cloturee') THEN 'cloture'
  ELSE status
END,
"updatedAt" = CURRENT_TIMESTAMP
WHERE lower(status) IN ('assigne', 'assigné', 'en transit', 'clôturé', 'cloturee');

UPDATE "Incident"
SET status = 'cloture', "updatedAt" = CURRENT_TIMESTAMP
WHERE status = 'clôturé';

DELETE FROM "Document"
WHERE lower(name) IN ('traking liste', 'tracking liste')
  AND "caseId" IS NULL;
