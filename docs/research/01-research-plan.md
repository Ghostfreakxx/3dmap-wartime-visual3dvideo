# 01 · Research plan and evidence rules

*The Ahom Kingdom, 1228–1826: an animated map documentary. Phase 1 document, compiled 2026-11-07.*

## 1. What Phase 1 delivers and what it does not

| Delivered | Not delivered (deliberately) |
|---|---|
| Source registry with catalogue-verified bibliography (`data/sources/registry.json`) | Page numbers, because none have been checked in a physical or scanned edition yet |
| Draft chronology of 57 typed events (`data/chronology/events.json`) | Narration scripts (placeholders only; one prototype draft in the storyboard) |
| Gazetteer of 38 places and 16 polities with precision flags (`data/gazetteer/places.json`) | Any territorial polygon. All 22 snapshots are `planned` with no geometry |
| Event schema (`src/domain/types.ts`) and validator (`scripts/validate-research.mjs`) | Next.js app, map, and animations (Phase 2+) |
| This plan, a dossier, a gaps register, the geographic data plan, the storyboard, and the architecture | |

## 2. Source hierarchy

Claims are graded by the *best* support they have, not by how many sources repeat them.

1. **Primary**: Buranji chronicles in edited translation (e.g. Golap Chandra Barua's *Ahom-Buranji*, 1930), treaty texts (Yandabo 1826), and eyewitness accounts (Talish for 1662–63, Welsh's 1794 report).
2. **Scholarly**: Gait (1906), Barpujari (ed.), *Comprehensive History of Assam* vols. 2–3, S. L. Baruah (1985), Guha (1991), Gogoi (1968), and S. K. Bhuyan (1947, 1949). Later scholarship, such as Y. Saikia (2004), is used for historiography and memory.
3. **Official**: UNESCO World Heritage documentation, the Archaeological Survey of India and the Directorate of Archaeology Assam, and the Government of India's Indian Culture portal.
4. **Reference**: encyclopaedias, used only to orient.
5. **Finding aids**: Wikipedia and similar. These are allowed for locating discrepancies and candidate citations. The validator **fails** any event supported only by a finding aid.

### Known biases to correct for
- **Gait (1906)** wrote as a colonial administrator, and his chronology closely follows the Buranjis. Treat it as the reference chronology, and cross-check his interpretations against Barpujari and Guha.
- **Buranjis** were court chronicles. They are strong on dates and court politics, partisan on the ruling faction, and they convert dates from the Tai sixty-year cycle. Their account of the dynasty's origins is a legitimation narrative.
- **Mughal Persian sources** (Talish) are eyewitness accounts but imperial in viewpoint. Their army and casualty figures differ from Assamese sources.
- **Bhuyan (1947)** shaped the modern Lachit narrative. Heroic details are tagged *traditional* unless they are independently attested.
- **The Burmese side** (1817–26) is currently represented only through Assam-side and Company sources. This is a known gap (see `03-uncertainties-and-gaps.md`).
- **Modern identity politics**: the Ahom past is actively used in present-day politics (Saikia 2004). Narration avoids nationalist framing of neighbours, especially Kacharis, Chutias, Koches, Mughals and Burmese.

## 3. Confidence and claim-status scales

Every event carries **two** independent labels.

| Confidence | Meaning | On screen |
|---|---|---|
| **A** | Primary text, or several independent scholarly sources agree; date and place are secure | No caveat |
| **B** | Standard scholarly account, usually chronicle-derived; page locator still pending | Source chip only |
| **C** | Sources disagree, or the date or place is inferred | "Approximate" / "Disputed" tag |
| **D** | Tradition, legend or anecdote | "According to tradition" tag; never shown as a quotation |

| Claim status | Use |
|---|---|
| `documented` | The event happened as summarised |
| `disputed` | Credible sources disagree on date, terms or outcome; alternatives are listed in `date.alternatives` / `disputes` |
| `approximate` | The event is real, but its geography or timing is reconstructed |
| `traditional` | Known only from tradition |

Geography has a **separate** precision scale (`site` / `locality` / `regional` / `unidentified`). A documented event can still have approximate geography.

## 4. Hard rules (enforced or to be enforced by the validator)

1. **No unsourced numbers.** Army sizes, casualties, indemnities and population figures appear only through `numericClaims` with a non-finding-aid source. *Currently, none are recorded.*
2. **No invented routes.** Migration and campaign paths are drawn as `schematic-corridor` unless confidence is A. A route may not pass through an `unidentified` place.
3. **Occupation ≠ annexation.** Every `occupation-begins` must be paired with an end, a withdrawal, a retreat arrow, or an explicit note.
4. **No modern borders as historical borders.** Any geometry segment that follows a modern boundary sets `usesModernBoundary: true` and must carry a visible `displayCaveat`.
5. **Low-confidence geometry (C/D) must carry an on-screen caveat.**
6. **No invented dialogue.** Sayings attributed to historical figures go in `narration.traditionalSayings`, with provenance notes.
7. **Page numbers are never guessed.** `pages: null` until someone has seen the page in a named edition, and the registry's `pagesChecked` flag must then be set.

## 5. Verification workflow for each event (Phase 2 onward)

1. Pull the Gait locator, then confirm it in Barpujari vol. 2 (political) or vol. 3 (institutional). Record the **edition and page**.
2. If the two disagree, add `date.alternatives` and set `claimStatus: disputed`.
3. For military events, check whether the primary chronicle (Barua 1930 or the DHAS Buranji editions) gives the detail being animated. If not, drop the detail or tag it as tradition.
4. Verify place coordinates against GeoNames, Survey of India sheets, or satellite imagery, then set `coordVerified: true`.
5. Run `node scripts/validate-research.mjs --strict` before any recording session.

## 6. Research tasks queue (priority order)

| # | Task | Unblocks |
|---|---|---|
| R1 | Obtain Gait 1906 (archive.org scan) and Barpujari vol. 2; fill page locators for Episodes 2, 6, 7 and 8 | Prototype + flagship battle episodes |
| R2 | Fetch UNESCO WHC property page + nomination dossier for the Moidams (coordinates, dates) | Charaideo marker accuracy |
| R3 | Locate the full text of the Treaty of Yandabo (Aitchison) and the 1833 Purandar Singha agreement | Episode 12 + epilogue |
| R4 | Locate an English edition of Talish (*Fathiyya-i-Ibriyya*) | Episode 6 detail |
| R5 | Resolve the Ghilajharighat boundary (Bharali / Kalang?) and Asurar Ali alignment | Snapshots s1639, s1663 |
| R6 | Burmese-side scholarship for 1817–1824 | Episode 11 commanders and dates |
| R7 | ASI / Assam State Archaeology notices for monument dates | Episode 9 |
| R8 | Gogoi (1968) on Mong Mao and the migration | Episode 1 framing |

## 7. Environment note

During Phase 1 the build environment's network policy **blocked archive.org**, which hosts the public-domain Gait scans. Bibliographic details were confirmed through library catalogues (HathiTrust, CRL, CiNii, WorldCat, SOAS, Duke University Press). Page-level verification needs archive.org to be allowed in the session's network settings, or a local copy of the text.
