import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, unique, check } from "drizzle-orm/sqlite-core";

const id = (name: string) => text(name).notNull();
export const lexiconEntries = sqliteTable("lexicon_entries", {
  id: id("id").primaryKey(), createdAt: id("created_at"),
}, t => [check("entry_id_nonempty", sql`${t.id} <> ''`)]);
export const lexiconRevisions = sqliteTable("lexicon_revisions", {
  id: id("id").primaryKey(), entryId: id("entry_id").references(() => lexiconEntries.id),
  revisionNumber: integer("revision_number").notNull(), lemma: id("lemma"), partOfSpeech: id("part_of_speech"), sense: id("sense"),
  status: id("status").default("draft"), person: integer("person"), initialSound: text("initial_sound"),
  adjectiveUsesJson: text("adjective_uses_json"), markerKind: text("marker_kind"), attributesJson: id("attributes_json"), contentHash: id("content_hash"),
}, t => [unique("revision_entry_number").on(t.entryId, t.revisionNumber),
  check("revision_number_positive", sql`${t.revisionNumber} > 0`),
  check("revision_strings", sql`${t.id} <> '' AND ${t.sense} <> '' AND ${t.lemma} <> '' AND ${t.lemma} NOT GLOB '*[^a-z]*'`),
  check("revision_pos", sql`${t.partOfSpeech} IN ('noun','adjective','verb','function-word')`),
  check("revision_status", sql`${t.status} IN ('draft','approved','rejected')`),
  check("revision_person", sql`${t.person} IS NULL OR ${t.person} IN (0,1)`),
  check("revision_sound", sql`${t.initialSound} IS NULL OR ${t.initialSound} IN ('vowel','consonant')`),
  check("revision_marker", sql`${t.markerKind} IS NULL OR ${t.markerKind} IN ('determiner','subject-pronoun','object-pronoun','auxiliary','adverb','connector','marker')`),
  check("revision_json", sql`json_valid(${t.attributesJson}) AND (${t.adjectiveUsesJson} IS NULL OR json_valid(${t.adjectiveUsesJson}))`),
  check("revision_hash", sql`length(${t.contentHash}) = 64 AND ${t.contentHash} NOT GLOB '*[^0-9a-f]*'`),
]);
export const lexiconForms = sqliteTable("lexicon_forms", {
  revisionId: id("revision_id").references(() => lexiconRevisions.id), formKind: id("form_kind"), surface: id("surface"), initialSound: text("initial_sound"),
}, t => [primaryKey({ columns: [t.revisionId, t.formKind] }),
  check("form_kind_enum", sql`${t.formKind} IN ('singular','plural','positive','base','third','past','participle','progressive','marker')`),
  check("form_surface", sql`${t.surface} <> '' AND ${t.surface} NOT GLOB '*[^a-z]*'`),
  check("form_sound", sql`${t.initialSound} IS NULL OR ${t.initialSound} IN ('vowel','consonant')`),
]);
export const lexiconFrames = sqliteTable("lexicon_frames", {
  id: id("id"), revisionId: id("revision_id").references(() => lexiconRevisions.id), pattern: id("pattern"),
  recipient: text("recipient"), complement: text("complement"), allowProgressive: integer("allow_progressive").notNull(), allowPerfect: integer("allow_perfect").notNull(),
  passivePromotion: text("passive_promotion"), allowedPurposesJson: id("allowed_purposes_json"), allowedPolaritiesJson: id("allowed_polarities_json"), fixedTail: text("fixed_tail"), locationJson: text("location_json"),
}, t => [primaryKey({ columns: [t.revisionId, t.id] }),
  check("frame_id", sql`${t.id} <> ''`), check("frame_pattern", sql`${t.pattern} IN ('SV','SVO','SVC','SVOO','SVOC')`),
  check("frame_flags", sql`${t.allowProgressive} IN (0,1) AND ${t.allowPerfect} IN (0,1)`),
  check("frame_recipient", sql`${t.recipient} IS NULL OR ${t.recipient} = 'person'`),
  check("frame_complement", sql`${t.complement} IS NULL OR ${t.complement} IN ('single-adjective','noun-or-single-adjective','location-phrase')`),
  check("frame_passive", sql`${t.passivePromotion} IS NULL OR ${t.passivePromotion} IN ('direct-object','direct-object-or-recipient')`),
  check("frame_tail", sql`${t.fixedTail} IS NULL OR ${t.fixedTail} = 'to school'`),
  check("frame_shape", sql`(${t.pattern} = 'SVOO') = (${t.recipient} IS NOT NULL) AND
    (${t.pattern} IN ('SVC','SVOC')) = (${t.complement} IS NOT NULL) AND
    (${t.passivePromotion} IS NULL OR (${t.pattern} = 'SVO' AND ${t.passivePromotion} = 'direct-object') OR (${t.pattern} = 'SVOO' AND ${t.passivePromotion} = 'direct-object-or-recipient')) AND
    (${t.fixedTail} IS NULL OR ${t.pattern} = 'SV')`),
  check("frame_location", sql`${t.locationJson} IS NULL OR COALESCE((json_valid(${t.locationJson}) AND json_type(${t.locationJson})='object' AND
    json_type(${t.locationJson},'$.policyId')='text' AND json_extract(${t.locationJson},'$.policyId') IN ('basic-object-location','legacy-sv-location','legacy-sv-under-location') AND
    json_type(${t.locationJson},'$.attachment')='text' AND json_type(${t.locationJson},'$.presence')='text' AND ${t.fixedTail} IS NULL AND
    ((json_extract(${t.locationJson},'$.attachment')='complement' AND json_extract(${t.locationJson},'$.presence')='required' AND json_extract(${t.locationJson},'$.policyId')='basic-object-location' AND ${t.pattern}='SVC' AND ${t.complement}='location-phrase' AND ${t.allowProgressive}=0 AND ${t.allowPerfect}=0 AND ${t.passivePromotion} IS NULL) OR
     (json_extract(${t.locationJson},'$.attachment')='adverbial' AND json_extract(${t.locationJson},'$.presence')='optional' AND json_extract(${t.locationJson},'$.policyId') IN ('legacy-sv-location','legacy-sv-under-location') AND ${t.pattern}='SV' AND ${t.complement} IS NULL))),0)`),
  check("frame_location_complement", sql`(${t.complement}='location-phrase') IS NOT 1 OR ${t.locationJson} IS NOT NULL`),
  check("frame_json", sql`json_valid(${t.allowedPurposesJson}) AND json_valid(${t.allowedPolaritiesJson})`),
]);
export const lexiconSources = sqliteTable("lexicon_sources", {
  id: id("id").primaryKey(), version: id("version"), title: id("title"), license: id("license"), attribution: id("attribution"), frozenHash: id("frozen_hash"),
}, t => [check("source_strings", sql`${t.id} <> '' AND ${t.version} <> '' AND ${t.title} <> '' AND ${t.license} <> '' AND ${t.attribution} <> ''`),
  check("source_hash", sql`length(${t.frozenHash}) = 64 AND ${t.frozenHash} NOT GLOB '*[^0-9a-f]*'`)]);
export const lexiconRevisionSources = sqliteTable("lexicon_revision_sources", {
  revisionId: id("revision_id").references(() => lexiconRevisions.id), sourceId: id("source_id").references(() => lexiconSources.id),
}, t => [primaryKey({ columns: [t.revisionId, t.sourceId] })]);
export const lexiconReviews = sqliteTable("lexicon_reviews", {
  id: id("id").primaryKey(), revisionId: id("revision_id").references(() => lexiconRevisions.id), contentHash: id("content_hash"),
  decision: id("decision"), reviewer: id("reviewer"), reviewedAt: id("reviewed_at"),
}, t => [check("review_decision", sql`${t.decision} IN ('approve','reject')`),
  check("review_strings", sql`${t.id} <> '' AND ${t.reviewer} <> ''`),
  check("review_hash", sql`length(${t.contentHash}) = 64 AND ${t.contentHash} NOT GLOB '*[^0-9a-f]*'`)]);
export const lexiconReleases = sqliteTable("lexicon_releases", {
  lexiconVersion: id("lexicon_version").primaryKey(), formatVersion: integer("format_version").notNull(), lexiconHash: id("lexicon_hash"), publishedAt: id("published_at"),
}, t => [check("release_version", sql`${t.lexiconVersion} <> '' AND ${t.formatVersion} = 2`),
  check("release_hash", sql`length(${t.lexiconHash}) = 64 AND ${t.lexiconHash} NOT GLOB '*[^0-9a-f]*'`)]);
export const lexiconReleaseItems = sqliteTable("lexicon_release_items", {
  lexiconVersion: id("lexicon_version").references(() => lexiconReleases.lexiconVersion), entryId: id("entry_id").references(() => lexiconEntries.id),
  revisionId: id("revision_id").references(() => lexiconRevisions.id), reviewId: id("review_id").references(() => lexiconReviews.id), frozenContentJson: id("frozen_content_json"), contentHash: id("content_hash"),
}, t => [primaryKey({ columns: [t.lexiconVersion, t.entryId] }), check("release_content", sql`json_valid(${t.frozenContentJson})`),
  check("release_item_hash", sql`length(${t.contentHash}) = 64 AND ${t.contentHash} NOT GLOB '*[^0-9a-f]*'`)]);
