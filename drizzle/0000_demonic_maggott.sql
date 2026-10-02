CREATE TABLE `lexicon_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "entry_id_nonempty" CHECK("lexicon_entries"."id" <> '')
);
--> statement-breakpoint
CREATE TABLE `lexicon_forms` (
	`revision_id` text NOT NULL,
	`form_kind` text NOT NULL,
	`surface` text NOT NULL,
	`initial_sound` text,
	PRIMARY KEY(`revision_id`, `form_kind`),
	FOREIGN KEY (`revision_id`) REFERENCES `lexicon_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "form_kind_enum" CHECK("lexicon_forms"."form_kind" IN ('singular','plural','positive','base','third','past','participle','progressive','marker')),
	CONSTRAINT "form_surface" CHECK("lexicon_forms"."surface" <> '' AND "lexicon_forms"."surface" NOT GLOB '*[^a-z]*'),
	CONSTRAINT "form_sound" CHECK("lexicon_forms"."initial_sound" IS NULL OR "lexicon_forms"."initial_sound" IN ('vowel','consonant'))
);
--> statement-breakpoint
CREATE TABLE `lexicon_frames` (
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
	CONSTRAINT "frame_id" CHECK("lexicon_frames"."id" <> ''),
	CONSTRAINT "frame_pattern" CHECK("lexicon_frames"."pattern" IN ('SV','SVO','SVC','SVOO','SVOC')),
	CONSTRAINT "frame_flags" CHECK("lexicon_frames"."allow_progressive" IN (0,1) AND "lexicon_frames"."allow_perfect" IN (0,1)),
	CONSTRAINT "frame_recipient" CHECK("lexicon_frames"."recipient" IS NULL OR "lexicon_frames"."recipient" = 'person'),
	CONSTRAINT "frame_complement" CHECK("lexicon_frames"."complement" IS NULL OR "lexicon_frames"."complement" IN ('single-adjective','noun-or-single-adjective')),
	CONSTRAINT "frame_passive" CHECK("lexicon_frames"."passive_promotion" IS NULL OR "lexicon_frames"."passive_promotion" IN ('direct-object','direct-object-or-recipient')),
	CONSTRAINT "frame_tail" CHECK("lexicon_frames"."fixed_tail" IS NULL OR "lexicon_frames"."fixed_tail" = 'to school'),
	CONSTRAINT "frame_shape" CHECK(("lexicon_frames"."pattern" = 'SVOO') = ("lexicon_frames"."recipient" IS NOT NULL) AND
    ("lexicon_frames"."pattern" IN ('SVC','SVOC')) = ("lexicon_frames"."complement" IS NOT NULL) AND
    ("lexicon_frames"."passive_promotion" IS NULL OR ("lexicon_frames"."pattern" = 'SVO' AND "lexicon_frames"."passive_promotion" = 'direct-object') OR ("lexicon_frames"."pattern" = 'SVOO' AND "lexicon_frames"."passive_promotion" = 'direct-object-or-recipient')) AND
    ("lexicon_frames"."fixed_tail" IS NULL OR "lexicon_frames"."pattern" = 'SV')),
	CONSTRAINT "frame_json" CHECK(json_valid("lexicon_frames"."allowed_purposes_json") AND json_valid("lexicon_frames"."allowed_polarities_json"))
);
--> statement-breakpoint
CREATE TABLE `lexicon_release_items` (
	`lexicon_version` text NOT NULL,
	`entry_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`review_id` text NOT NULL,
	`frozen_content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	PRIMARY KEY(`lexicon_version`, `entry_id`),
	FOREIGN KEY (`lexicon_version`) REFERENCES `lexicon_releases`(`lexicon_version`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entry_id`) REFERENCES `lexicon_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revision_id`) REFERENCES `lexicon_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`review_id`) REFERENCES `lexicon_reviews`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "release_content" CHECK(json_valid("lexicon_release_items"."frozen_content_json")),
	CONSTRAINT "release_item_hash" CHECK(length("lexicon_release_items"."content_hash") = 64 AND "lexicon_release_items"."content_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE TABLE `lexicon_releases` (
	`lexicon_version` text PRIMARY KEY NOT NULL,
	`format_version` integer NOT NULL,
	`lexicon_hash` text NOT NULL,
	`published_at` text NOT NULL,
	CONSTRAINT "release_version" CHECK("lexicon_releases"."lexicon_version" <> '' AND "lexicon_releases"."format_version" = 1),
	CONSTRAINT "release_hash" CHECK(length("lexicon_releases"."lexicon_hash") = 64 AND "lexicon_releases"."lexicon_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE TABLE `lexicon_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`revision_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`decision` text NOT NULL,
	`reviewer` text NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`revision_id`) REFERENCES `lexicon_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "review_decision" CHECK("lexicon_reviews"."decision" IN ('approve','reject')),
	CONSTRAINT "review_strings" CHECK("lexicon_reviews"."id" <> '' AND "lexicon_reviews"."reviewer" <> ''),
	CONSTRAINT "review_hash" CHECK(length("lexicon_reviews"."content_hash") = 64 AND "lexicon_reviews"."content_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE TABLE `lexicon_revision_sources` (
	`revision_id` text NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`revision_id`, `source_id`),
	FOREIGN KEY (`revision_id`) REFERENCES `lexicon_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `lexicon_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lexicon_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`lemma` text NOT NULL,
	`part_of_speech` text NOT NULL,
	`sense` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`person` integer,
	`initial_sound` text,
	`adjective_uses_json` text,
	`marker_kind` text,
	`attributes_json` text NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `lexicon_entries`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "revision_number_positive" CHECK("lexicon_revisions"."revision_number" > 0),
	CONSTRAINT "revision_strings" CHECK("lexicon_revisions"."id" <> '' AND "lexicon_revisions"."sense" <> '' AND "lexicon_revisions"."lemma" <> '' AND "lexicon_revisions"."lemma" NOT GLOB '*[^a-z]*'),
	CONSTRAINT "revision_pos" CHECK("lexicon_revisions"."part_of_speech" IN ('noun','adjective','verb','function-word')),
	CONSTRAINT "revision_status" CHECK("lexicon_revisions"."status" IN ('draft','approved','rejected')),
	CONSTRAINT "revision_person" CHECK("lexicon_revisions"."person" IS NULL OR "lexicon_revisions"."person" IN (0,1)),
	CONSTRAINT "revision_sound" CHECK("lexicon_revisions"."initial_sound" IS NULL OR "lexicon_revisions"."initial_sound" IN ('vowel','consonant')),
	CONSTRAINT "revision_marker" CHECK("lexicon_revisions"."marker_kind" IS NULL OR "lexicon_revisions"."marker_kind" IN ('determiner','subject-pronoun','object-pronoun','auxiliary','adverb','connector','marker')),
	CONSTRAINT "revision_json" CHECK(json_valid("lexicon_revisions"."attributes_json") AND ("lexicon_revisions"."adjective_uses_json" IS NULL OR json_valid("lexicon_revisions"."adjective_uses_json"))),
	CONSTRAINT "revision_hash" CHECK(length("lexicon_revisions"."content_hash") = 64 AND "lexicon_revisions"."content_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revision_entry_number` ON `lexicon_revisions` (`entry_id`,`revision_number`);--> statement-breakpoint
CREATE TABLE `lexicon_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`title` text NOT NULL,
	`license` text NOT NULL,
	`attribution` text NOT NULL,
	`frozen_hash` text NOT NULL,
	CONSTRAINT "source_strings" CHECK("lexicon_sources"."id" <> '' AND "lexicon_sources"."version" <> '' AND "lexicon_sources"."title" <> '' AND "lexicon_sources"."license" <> '' AND "lexicon_sources"."attribution" <> ''),
	CONSTRAINT "source_hash" CHECK(length("lexicon_sources"."frozen_hash") = 64 AND "lexicon_sources"."frozen_hash" NOT GLOB '*[^0-9a-f]*')
);
