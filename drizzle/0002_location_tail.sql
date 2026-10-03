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
	PRIMARY KEY(`revision_id`, `id`),
	FOREIGN KEY (`revision_id`) REFERENCES `lexicon_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "frame_id" CHECK("lexicon_frames_next"."id" <> ''),
	CONSTRAINT "frame_pattern" CHECK("lexicon_frames_next"."pattern" IN ('SV','SVO','SVC','SVOO','SVOC')),
	CONSTRAINT "frame_flags" CHECK("lexicon_frames_next"."allow_progressive" IN (0,1) AND "lexicon_frames_next"."allow_perfect" IN (0,1)),
	CONSTRAINT "frame_recipient" CHECK("lexicon_frames_next"."recipient" IS NULL OR "lexicon_frames_next"."recipient" = 'person'),
	CONSTRAINT "frame_complement" CHECK("lexicon_frames_next"."complement" IS NULL OR "lexicon_frames_next"."complement" IN ('single-adjective','noun-or-single-adjective')),
	CONSTRAINT "frame_passive" CHECK("lexicon_frames_next"."passive_promotion" IS NULL OR "lexicon_frames_next"."passive_promotion" IN ('direct-object','direct-object-or-recipient')),
	CONSTRAINT "frame_tail" CHECK("lexicon_frames_next"."fixed_tail" IS NULL OR "lexicon_frames_next"."fixed_tail" IN ('to school','location:in,on,near','location:in,on,under,near')),
	CONSTRAINT "frame_shape" CHECK(("lexicon_frames_next"."pattern" = 'SVOO') = ("lexicon_frames_next"."recipient" IS NOT NULL) AND
    ("lexicon_frames_next"."pattern" IN ('SVC','SVOC')) = ("lexicon_frames_next"."complement" IS NOT NULL) AND
    ("lexicon_frames_next"."passive_promotion" IS NULL OR ("lexicon_frames_next"."pattern" = 'SVO' AND "lexicon_frames_next"."passive_promotion" = 'direct-object') OR ("lexicon_frames_next"."pattern" = 'SVOO' AND "lexicon_frames_next"."passive_promotion" = 'direct-object-or-recipient')) AND
    ("lexicon_frames_next"."fixed_tail" IS NULL OR "lexicon_frames_next"."pattern" = 'SV')),
	CONSTRAINT "frame_json" CHECK(json_valid("lexicon_frames_next"."allowed_purposes_json") AND json_valid("lexicon_frames_next"."allowed_polarities_json"))
);

INSERT INTO lexicon_frames_next SELECT * FROM lexicon_frames;
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
