# Appendix A - Methodology and Use of AI - Part B (Hospital Monitoring System)

This appendix explains how the team produced this document, and in particular how it used an AI assistant (Claude, by Anthropic). It is meant to be transparent about the process, and to explain why the document is as detailed as it is.

## 1. Approach: discussion first, writing second

We centred the work on **discussion, brainstorming and research** rather than on writing directly. The team met, talked through the problem statement (part-b.pdf), explored the scenarios, the hazards, the stakeholders and the interface with the ADC team (Part A), and made decisions out loud: thresholds, retention periods, what is in and out of scope, what happens in failure cases.

## 2. Workflow

| Step | Who | What |
| --- | --- | --- |
| 1. Discussion | Team | Brainstorming and research sessions on the requirements, hazards, actors and design choices. The audio of these discussions was **recorded**. |
| 2. First synthesis | AI (Claude) | The recordings were given to Claude, which transcribed, structured and formatted everything said into a first version of the documents: requirements, user stories, assumptions, decisions, diagrams. |
| 3. Team review and extension | Team | We took this first version and made it ours: we added cases, ideas, categories, user stories, constraints and requirements, corrected what did not reflect our intent, and dropped what did not belong. |
| 4. AI review and suggestions | AI (Claude) | Claude reviewed the whole document and gave us leads: what we might have forgotten, what could be improved, what was not precise enough, and what we had missed in the assignment instructions. |
| 5. Team decisions on the feedback | Team | We read all of Claude's feedback ourselves and decided, item by item, what we wanted Claude to change and what we did not. Nothing was applied automatically. |
| 6. Consistency pass | AI (Claude), checked by the team | We went back to Claude to format the final files and check consistency across them: identifiers (FR, NFR, US, A, D), cross-references and links between files, the traceability matrix, and the alignment between requirements, stories, components and diagrams. |
| 7. Final full read-through | Team | At the end, we re-read the whole document from A to Z to check that it matches everything we wanted. |

## 3. Why the document is so detailed

The amount of content comes from this process. Everything said during the discussions was captured and synthesized by the AI, so the first version was far more exhaustive than what we would have written by hand in the same time. We then enriched it instead of starting from a blank page. The level of detail (many requirements, decisions and traceability links) is the result of that combination.

## 4. Role of the AI, and responsibility of the team

- **What the AI did**: synthesize our recorded discussions, structure and format the documents, suggest improvements (omissions, imprecise points, missed instructions), and check mechanical consistency (numbering, links, cross-references).
- **What the team did**: all the reasoning behind the content. The ideas, the decisions, the safety considerations and the final choices come from our discussions; the team also added and corrected content after the first synthesis, validated or rejected each suggestion made by the AI, and re-read the final result in full.
- **Responsibility**: the team owns the content of this document and is responsible for it. The AI was a synthesis and verification tool, not the source of the decisions.
