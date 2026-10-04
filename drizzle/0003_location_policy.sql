-- Current format 2 only. Refuse populated format-1 databases; preserve their signed rows.
CREATE TEMP TABLE stage33_empty_database (n INTEGER CHECK(n=0));
INSERT INTO stage33_empty_database SELECT (SELECT count(*) FROM lexicon_revisions) + (SELECT count(*) FROM lexicon_sources) + (SELECT count(*) FROM lexicon_reviews) + (SELECT count(*) FROM lexicon_releases);
DROP TABLE stage33_empty_database;
-- Audited finite tail domain expansion; preserve old values and all frame guards.
CREATE TABLE `lexicon_frames_next` (
	`id` text NOT NULL,
	`revision_id` text NOT NULL,
	`pattern` text NOT NULL,
	`recipient` text,
	`complement` text,
	`allow_progressive` integer NOT NULL,
	`allow_perfect` integer NOT NULL,
	`passive_promotion` text,
	`allowed_purposes_json` text NOT NULL,
	`allowed_polarities_json` text NOT NULL,
	`fixed_tail` text,
	`location_json` text,
	PRIMARY KEY(`revision_id`, `id`),
	FOREIGN KEY (`revision_id`) REFERENCES `lexicon_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "frame_id" CHECK("lexicon_frames_next"."id" <> ''),
	CONSTRAINT "frame_pattern" CHECK("lexicon_frames_next"."pattern" IN ('SV','SVO','SVC','SVOO','SVOC')),
	CONSTRAINT "frame_flags" CHECK("lexicon_frames_next"."allow_progressive" IN (0,1) AND "lexicon_frames_next"."allow_perfect" IN (0,1)),
	CONSTRAINT "frame_recipient" CHECK("lexicon_frames_next"."recipient" IS NULL OR "lexicon_frames_next"."recipient" = 'person'),
	CONSTRAINT "frame_complement" CHECK("lexicon_frames_next"."complement" IS NULL OR "lexicon_frames_next"."complement" IN ('single-adjective','noun-or-single-adjective','location-phrase')),
	CONSTRAINT "frame_passive" CHECK("lexicon_frames_next"."passive_promotion" IS NULL OR "lexicon_frames_next"."passive_promotion" IN ('direct-object','direct-object-or-recipient')),
	CONSTRAINT "frame_tail" CHECK("lexicon_frames_next"."fixed_tail" IS NULL OR "lexicon_frames_next"."fixed_tail" = 'to school'),
	CONSTRAINT "frame_shape" CHECK(("lexicon_frames_next"."pattern" = 'SVOO') = ("lexicon_frames_next"."recipient" IS NOT NULL) AND
    ("lexicon_frames_next"."pattern" IN ('SVC','SVOC')) = ("lexicon_frames_next"."complement" IS NOT NULL) AND
    ("lexicon_frames_next"."passive_promotion" IS NULL OR ("lexicon_frames_next"."pattern" = 'SVO' AND "lexicon_frames_next"."passive_promotion" = 'direct-object') OR ("lexicon_frames_next"."pattern" = 'SVOO' AND "lexicon_frames_next"."passive_promotion" = 'direct-object-or-recipient')) AND
    ("lexicon_frames_next"."fixed_tail" IS NULL OR "lexicon_frames_next"."pattern" = 'SV')),
	CONSTRAINT "frame_json" CHECK(json_valid("lexicon_frames_next"."allowed_purposes_json") AND json_valid("lexicon_frames_next"."allowed_polarities_json")) ,
  CONSTRAINT frame_location CHECK(location_json IS NULL OR COALESCE((json_valid(location_json) AND json_type(location_json)='object' AND
    json_type(location_json,'$.policyId')='text' AND json_extract(location_json,'$.policyId') IN ('basic-object-location','legacy-sv-location','legacy-sv-under-location') AND
    json_type(location_json,'$.attachment')='text' AND json_type(location_json,'$.presence')='text' AND fixed_tail IS NULL AND
    ((json_extract(location_json,'$.attachment')='complement' AND json_extract(location_json,'$.presence')='required' AND json_extract(location_json,'$.policyId')='basic-object-location' AND pattern='SVC' AND complement='location-phrase' AND allow_progressive=0 AND allow_perfect=0 AND passive_promotion IS NULL) OR
     (json_extract(location_json,'$.attachment')='adverbial' AND json_extract(location_json,'$.presence')='optional' AND json_extract(location_json,'$.policyId') IN ('legacy-sv-location','legacy-sv-under-location') AND pattern='SV' AND complement IS NULL))),0)),
  CONSTRAINT frame_location_complement CHECK((complement='location-phrase') IS NOT 1 OR location_json IS NOT NULL)
);

DROP TABLE lexicon_frames;
ALTER TABLE lexicon_frames_next RENAME TO lexicon_frames;
CREATE TRIGGER lexicon_frames_insert_draft BEFORE INSERT ON lexicon_frames
WHEN (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;


CREATE TRIGGER lexicon_frames_update_draft BEFORE UPDATE ON lexicon_frames
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft' OR (SELECT status FROM lexicon_revisions WHERE id=NEW.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;


CREATE TRIGGER lexicon_frames_delete_draft BEFORE DELETE ON lexicon_frames
WHEN (SELECT status FROM lexicon_revisions WHERE id=OLD.revision_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Reviewed revision children are immutable'); END;


CREATE TRIGGER frames_sets_insert BEFORE INSERT ON lexicon_frames
WHEN json_type(NEW.allowed_purposes_json) <> 'array' OR json_array_length(NEW.allowed_purposes_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_purposes_json) WHERE type <> 'text' OR value NOT IN ('declarative','interrogative','imperative','exclamatory')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_purposes_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_purposes_json)) OR json_type(NEW.allowed_polarities_json) <> 'array' OR json_array_length(NEW.allowed_polarities_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_polarities_json) WHERE type <> 'text' OR value NOT IN ('positive','negative')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_polarities_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_polarities_json))
BEGIN SELECT RAISE(ABORT, 'Invalid frame purpose or polarity'); END;


CREATE TRIGGER frames_sets_update BEFORE UPDATE ON lexicon_frames
WHEN json_type(NEW.allowed_purposes_json) <> 'array' OR json_array_length(NEW.allowed_purposes_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_purposes_json) WHERE type <> 'text' OR value NOT IN ('declarative','interrogative','imperative','exclamatory')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_purposes_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_purposes_json)) OR json_type(NEW.allowed_polarities_json) <> 'array' OR json_array_length(NEW.allowed_polarities_json)=0 OR EXISTS (SELECT 1 FROM json_each(NEW.allowed_polarities_json) WHERE type <> 'text' OR value NOT IN ('positive','negative')) OR (SELECT COUNT(*) FROM json_each(NEW.allowed_polarities_json)) <> (SELECT COUNT(DISTINCT value) FROM json_each(NEW.allowed_polarities_json))
BEGIN SELECT RAISE(ABORT, 'Invalid frame purpose or polarity'); END;

CREATE TRIGGER frames_location_keys_insert BEFORE INSERT ON lexicon_frames
WHEN NEW.location_json IS NOT NULL AND (SELECT count(*) FROM json_each(NEW.location_json))<>3
BEGIN SELECT RAISE(ABORT,'Invalid location keys'); END;

CREATE TRIGGER frames_location_keys_update BEFORE UPDATE ON lexicon_frames
WHEN NEW.location_json IS NOT NULL AND (SELECT count(*) FROM json_each(NEW.location_json))<>3
BEGIN SELECT RAISE(ABORT,'Invalid location keys'); END;

CREATE TABLE lexicon_releases_next (
 lexicon_version TEXT PRIMARY KEY NOT NULL, format_version INTEGER NOT NULL, lexicon_hash TEXT NOT NULL, published_at TEXT NOT NULL,
 CONSTRAINT release_version CHECK(lexicon_version<>'' AND format_version=2),
 CONSTRAINT release_hash CHECK(length(lexicon_hash)=64 AND lexicon_hash NOT GLOB '*[^0-9a-f]*')
);
DROP TABLE lexicon_releases;
ALTER TABLE lexicon_releases_next RENAME TO lexicon_releases;
CREATE TRIGGER lexicon_releases_insert_frozen_conflict BEFORE INSERT ON lexicon_releases
WHEN EXISTS (SELECT 1 FROM lexicon_releases WHERE lexicon_version = NEW.lexicon_version OR rowid = NEW.rowid)
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
CREATE TRIGGER lexicon_releases_update_frozen BEFORE UPDATE ON lexicon_releases
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
CREATE TRIGGER lexicon_releases_delete_frozen BEFORE DELETE ON lexicon_releases
WHEN 1
BEGIN SELECT RAISE(ABORT, 'Frozen record is immutable'); END;
