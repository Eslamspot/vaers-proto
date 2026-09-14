# VAERS Modernized Reporting Prototype

Interactive, self-contained prototype of a modernized VAERS reporting
experience, prepared by Idealistic Solutions LLC as the **Tab 2-2
Prototype** for CDC solicitation **75D301-26-Q-00146**.

**Synthetic data only. Nothing is transmitted. No backend.**

## What it demonstrates

| Evaluation criterion | Where to see it |
|---|---|
| Understanding of the problem | Landing page + two submitter paths |
| Soundness / feasibility | Branching rules as an externalized config table (`BRANCH_RULES` in `site/app.js`) |
| Innovation | Intelligent completion, "Why we ask" side panel, reactive FAQ assistant |
| Risk mitigation | Step-boundary validation, free-text on every path, zero-transmission design |
| Alignment with performance requirements | Data elements mirror the current VAERS form; privacy rule enforced in-form |
| Scalability / extensibility | New submitter types and rules are pure configuration |

The **Prototype Guide** button on the page renders this mapping live,
plus the actual branching configuration the demo runs on.

## Section 508

Skip link, keyboard-operable wizard, visible focus, programmatically
associated hints, ARIA live regions for progress and assistant output,
high-contrast palette, `prefers-reduced-motion` support.

## Run

```bash
docker build -t vaers-proto .
docker run --rm -p 8080:8080 vaers-proto
# http://localhost:8080
```

Or serve `site/` with any static file server.

## Production notes (deliberately out of scope)

The prototype simulates: intelligent completion (5-entry demo list),
provider profile pre-fill, file uploads, and downloads. A production
build would pair this front end with CDC-managed infrastructure, the
existing VAERS data services, and the ATD/ATO path described in the
Technical Proposal (Tab 2-1).