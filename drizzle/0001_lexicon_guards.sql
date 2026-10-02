-- Reject frozen conflicts before SQLite can perform REPLACE's implicit deletion.
-- Cover both declared unique identities and explicit hidden-rowid conflicts.
-- These guards also apply when recursive_triggers is OFF on an external connection.
CREATE TRIGGER revision_insert_frozen_conflict BEFORE INSERT ON lexicon_revisions
WHEN EXISTS (
  SELECT 1 FROM lexicon_revisions
  WHERE status <> 'draft' AND (
    id = NEW.id OR (entry_id = NEW.entry_id AND revision_number = NEW.revision_number) OR rowid = NEW.rowid
  )
)
BEGIN SELECT RAISE(ABORT, 'Reviewed revision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_sources_insert_frozen_conflict BEFORE INSERT ON lexicon_sources
WHEN EXISTS (SELECT 1 FROM lexicon_sources WHERE id = NEW.id OR rowid = NEW.rowid)
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_reviews_insert_frozen_conflict BEFORE INSERT ON lexicon_reviews
WHEN EXISTS (SELECT 1 FROM lexicon_reviews WHERE id = NEW.id OR rowid = NEW.rowid)
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_releases_insert_frozen_conflict BEFORE INSERT ON lexicon_releases
WHEN EXISTS (SELECT 1 FROM lexicon_releases WHERE lexicon_version = NEW.lexicon_version OR rowid = NEW.rowid)
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_release_items_insert_frozen_conflict BEFORE INSERT ON lexicon_release_items
WHEN EXISTS (SELECT 1 FROM lexicon_release_items WHERE (lexicon_version = NEW.lexicon_version AND entry_id = NEW.entry_id) OR rowid = NEW.rowid)
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER revision_insert_draft BEFORE INSERT ON lexicon_revisions
WHEN NEW.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'New revision must be draft'); END;
--> statement-breakpoint
CREATE TRIGGER revision_frozen_update BEFORE UPDATE ON lexicon_revisions
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER revision_frozen_delete BEFORE DELETE ON lexicon_revisions
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER revision_status_review BEFORE UPDATE ON lexicon_revisions
WHEN NEW.status <> 'draft' AND NOT EXISTS (SELECT 1 FROM lexicon_reviews WHERE revision_id=OLD.id AND content_hash=NEW.content_hash AND decision=CASE NEW.status WHEN 'approved' THEN 'approve' ELSE 'reject' END)
BEGIN SELECT RAISE(ABORT, 'Matching review required'); END;
--> statement-breakpoint
CREATE TRIGGER revision_identity BEFORE UPDATE ON lexicon_revisions
WHEN NEW.id <> OLD.id OR NEW.entry_id <> OLD.entry_id OR NEW.revision_number <> OLD.revision_number
BEGIN SELECT RAISE(ABORT, 'Revision identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_forms_insert_draft BEFORE INSERT ON lexicon_forms
WHEN (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_forms_update_draft BEFORE UPDATE ON lexicon_forms
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft' OR (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_forms_delete_draft BEFORE DELETE ON lexicon_forms
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_frames_insert_draft BEFORE INSERT ON lexicon_frames
WHEN (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_frames_update_draft BEFORE UPDATE ON lexicon_frames
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft' OR (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_frames_delete_draft BEFORE DELETE ON lexicon_frames
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_revision_sources_insert_draft BEFORE INSERT ON lexicon_revision_sources
WHEN (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_revision_sources_update_draft BEFORE UPDATE ON lexicon_revision_sources
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft' OR (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_revision_sources_delete_draft BEFORE DELETE ON lexicon_revision_sources
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_sources_update_frozen BEFORE UPDATE ON lexicon_sources
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_sources_delete_frozen BEFORE DELETE ON lexicon_sources
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_reviews_update_frozen BEFORE UPDATE ON lexicon_reviews
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_reviews_delete_frozen BEFORE DELETE ON lexicon_reviews
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_releases_update_frozen BEFORE UPDATE ON lexicon_releases
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_releases_delete_frozen BEFORE DELETE ON lexicon_releases
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_release_items_update_frozen BEFORE UPDATE ON lexicon_release_items
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER lexicon_release_items_delete_frozen BEFORE DELETE ON lexicon_release_items
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER review_matches_draft BEFORE INSERT ON lexicon_reviews
WHEN NOT EXISTS (SELECT 1 FROM lexicon_revisions WHERE id=NEW.revision_id AND status='draft' AND content_hash=NEW.content_hash)
BEGIN SELECT RAISE(ABORT, 'Review must match draft hash'); END;
--> statement-breakpoint
CREATE TRIGGER frames_sets_insert BEFORE INSERT ON lexicon_frames
WHEN json_type(NEW.allowed_purposes_json) <> 'array' OR json_array_length(NEW.allowed_purposes_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_purposes_json) WHERE type <> 'text' OR value NOT IN ('declarative','interrogative','imperative','exclamatory')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_purposes_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_purposes_json)) OR json_type(NEW.allowed_polarities_json) <> 'array' OR json_array_length(NEW.allowed_polarities_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_polarities_json) WHERE type <> 'text' OR value NOT IN ('positive','negative')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_polarities_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_polarities_json))
BEGIN SELECT RAISE(ABORT, 'Invalid frame purpose or polarity'); END;
--> statement-breakpoint
CREATE TRIGGER frames_sets_update BEFORE UPDATE ON lexicon_frames
WHEN json_type(NEW.allowed_purposes_json) <> 'array' OR json_array_length(NEW.allowed_purposes_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_purposes_json) WHERE type <> 'text' OR value NOT IN ('declarative','interrogative','imperative','exclamatory')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_purposes_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_purposes_json)) OR json_type(NEW.allowed_polarities_json) <> 'array' OR json_array_length(NEW.allowed_polarities_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_polarities_json) WHERE type <> 'text' OR value NOT IN ('positive','negative')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_polarities_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_polarities_json))
BEGIN SELECT RAISE(ABORT, 'Invalid frame purpose or polarity'); END;
