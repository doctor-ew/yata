# Script source assessment

Reviewed: 17 November 2026. Status: research only. No script corpus ingestion, embedding, AWS mutation, or deployment was performed.

## Decision

Keep the existing TVmaze-summary pilot separate from these script leads. The reviewed pages do not establish permission to copy scripts into YATA's public retrieval service. Script Slug has explicit automated-access restrictions. Prioritize a small permission-backed source and verify the exact original episode and draft before indexing.

## Source assessment

| Source | Observed material and provenance | Retrieval status |
| --- | --- | --- |
| [SimplyScripts television directory](https://www.simplyscripts.com/tv_all.html) | Directory of externally hosted scripts and transcripts. It labels some locations as writers' websites, but also links fan archives and reposts. A directory entry is not evidence of rights ownership or an original-series match. | Its [administrative notice](https://www.simplyscripts.com/admin.html) reserves reproduction of site material and disclaims control over external sites. No grant for public RAG ingestion was identified. Check each actual host and document separately. |
| [Know It All Joe television posts](https://www.knowitalljoe.com/category/tv-scripts/) | Entertainment articles linking archival material; the reviewed Batman article presents production artifacts, not an official studio licensing feed. | No public retrieval or redistribution grant was identified in the reviewed category/article. The article's invitation to read a script does not establish permission for a hosted index. |
| [Daily Script television directory](https://www.dailyscript.com/tv.html) | Script collection with writer and draft labels, including original-era series. Two relevant PDF links were retrievable. | Its [home page](https://www.dailyscript.com/index.html) describes educational use. No explicit permission for YATA's public indexing or redistribution was identified. |
| [Script Slug series directory](https://www.scriptslug.com/scripts/format/series) | Educational screenplay library. The series page did not expose individual titles in the retrieved text. | Its [legal terms](https://www.scriptslug.com/legal), especially Terms sections 2 and 9, limit viewing and prohibit automated access, querying, scraping and downloading, including AI systems, without permission. Do not add an automated collector. Further document exploration was stopped after this restriction was found. |

Script Slug's statement about its own AI-training practices is not an affirmative license for someone else's retrieval application. Its educational/fair-use position also does not resolve YATA's separate use. This assessment records source conditions; it does not make a legal determination about an unlicensed implementation.

## Useful original-series leads and mapping hazards

- **Knight Rider:** SimplyScripts' generic listing links to a PDF whose target is explicitly the **2008 pilot**, not the original 1982 series. The [listed target](https://leethomson.myzen.co.uk/Knight_Rider_-_Pilot_%282008%29.pdf) timed out, so its contents were not inspected. The separate [Knight Rider Archive script index](https://www.knightriderarchive.com/scripts/scripts.html) also timed out. Do not use either listing to repair the pilot corpus's original-series numbering conflicts by assumption.
- **Starsky and Hutch — The Bait:** Daily Script lists a September 9, 1975 final draft and links a [70-page PDF](https://www.dailyscript.com/scripts/starsky_%20hutch-bait.pdf). This is a relevant research candidate, not a cleared transcript of YATA's particular video cut. Draft details here are the directory's labels; a complete document and episode comparison remains outstanding.
- **Star Trek — What Are Little Girls Made Of:** Daily Script labels a July 27, 1966 revised final draft and links a [59-page PDF](https://www.dailyscript.com/scripts/star_trek-what_are_little_girls_made_of.pdf). Preserve draft provenance separately from broadcast facts. Do not treat page numbers as playback timestamps.
- **Batman: The Animated Series:** The [Know It All Joe article](https://www.knowitalljoe.com/going-batty-batman-animated-series-storyboards-script/) distinguishes **The Underdwellers** storyboards, a **Joker's Wild** script, and a series writer's guide revised April 9, 1991. These are three different document types; the guide is not episode evidence, and storyboards are not automatically a dialogue transcript. The PDFs were not ingested or edition-matched.
- **Writer-hosted leads:** SimplyScripts labels Lee Goldberg's website as a location for scripts, outlines and treatments, including seaQuest material. The sampled **Chains of Command** [PDF link](https://www.leegoldberg.com/pdfs/chains%20of%20command.pdf) returned 404. The [writer's current site](https://leegoldberg.com/) resolves, but current availability and permission for that document remain unestablished. Writer-hosted material provides stronger provenance for asking permission; it does not automatically establish all distribution rights.

No Street Hawk entry was found on the reviewed SimplyScripts television page. That observation is limited to this page and is not a claim that scripts are unavailable elsewhere.

## Next verification

1. Select one relevant document and establish permitted retention, embedding, brief excerpt display and public retrieval with the applicable source/rightsholder. Retain the permission record and any attribution, removal or expiration requirements.
2. Verify original versus remake, exact episode identity, draft date, production code and whether the document is a script, transcript, outline, guide or storyboard. Reconcile numbering against the catalog without weakening the existing conservative matcher.
3. Compare the permitted document to the exact playable source. A draft can contain deleted scenes, different dialogue and alternate endings. Keep script evidence explicitly labeled; do not assert that every scripted event appears on screen.
4. Require separate timed alignment before scene jumps or current-playhead recaps. Untimed scripts and whole-episode summaries remain unsuitable for strict no-future-spoiler answers.
5. Add provenance and removal propagation for raw text, chunks and embeddings. Ingestion jobs and storage permissions must be represented in the AWS infrastructure as code; source discovery itself must not trigger infrastructure changes.

The summary pilot's strict Knight Rider coverage gap remains intentional: one accepted document and 78 numbering-conflict exclusions in the generated pilot. These script leads have not changed the corpus.
