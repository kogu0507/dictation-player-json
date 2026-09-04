---
name: AI implementation handoff
about: Create a bounded implementation task that ChatGPT or Codex can execute and review
title: ""
labels: ""
assignees: ""
---

## Goal

<!-- One concrete outcome. -->

## Evidence / context

<!-- Link or cite the code, test, prior Issue/PR, SPEC, or observed behavior that makes this task necessary. Avoid generic cleanup claims. -->

## Source of truth

<!-- Relevant repository docs/spec sections and, only when needed, Drive canonical docs. -->

## In scope

- 

## Out of scope

- Production/publication/deployment changes unless explicitly approved.
- Unrelated cleanup or refactoring.
- New UX, education, product, or compatibility decisions not already resolved by the source of truth.

## Acceptance criteria

- [ ] 
- [ ] 
- [ ] 

## Machine verification

<!-- Commands/checks expected after implementation, e.g. npm test / npm run build / targeted tests. -->

- [ ] 

## Implementation lane

<!-- Choose one. Small = ChatGPT may implement; Medium/Large = prefer Codex implementation. -->

- [ ] Small / localized / specification already fixed
- [ ] Medium or large / Codex implementation preferred

## Human-decision boundary

<!-- State unresolved decisions explicitly. If none, write "None". The implementer must stop rather than invent a new decision. -->

None

## Handoff rule

The implementer should work on a dedicated branch and open a PR that links this Issue. The PR is the return package: summarize changes, machine checks, deviations, and any newly discovered work that was intentionally left out.
