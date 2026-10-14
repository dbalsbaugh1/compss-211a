# Agentic code verification

A coding agent may read files, write code, run commands, use the network, or change project state. Before you let it act, decide what it may access and what evidence you will inspect afterward. You are responsible for the resulting code, data, costs, and claims.

Use this guide during Monday's lesson, Friday's lab, AI Usage Journal #3, and the generated-code audit in HW5.

## Chat answer or agentic action?

A chat assistant returns an explanation, draft, or code snippet. A coding agent can work inside a project: it may inspect files, edit them, run commands, read results, and choose another step. That extra ability is useful, but it also means a vague request can change real project state.

Keep three things separate:

- **The project** is the folder and files that persist.
- **The task** is the specific outcome you want now.
- **The conversation** is the temporary context in which you and the agent work on that task.

Starting a fresh conversation can reduce irrelevant context, but the new conversation still sees the project's files. Put durable decisions in the project rather than relying on chat memory. A project instruction file such as `AGENTS.md` can state recurring rules, but you must still inspect whether the agent followed them.

## Four levels of assistance

- **Explanation:** describes code or an error without changing anything.
- **Generation:** proposes code or text for you to inspect.
- **Execution:** runs code and observes its output.
- **Agentic action:** chooses and uses tools across several steps, possibly changing files or external state.

Before an agent starts, ask:

1. What files, services, and data can it access?
2. What may it change?
3. Which actions require approval?
4. What evidence will be left behind?
5. What condition should stop the task?

Use the least authority that permits the task. A request to explain a function does not require permission to edit the repository. A request to repair one notebook does not imply permission to reorganize unrelated folders, install arbitrary software, or publish anything.

When the agent requests approval, read the proposed action, target, and scope. Approval is a decision, not a button to clear automatically.

## From a vague request to a specification

Vague prompts can be useful for brainstorming, but they leave decisions to the agent. Two people can give the same vague prompt and receive different files, methods, or results.

Compare:

```text
Clean this dataset and summarize the groups.
```

with:

```text
Read data/waits.csv. Preserve every row and case_id. Treat a blank minutes value
as missing, not zero. Return one table with channel, cases, and mean_minutes.
Do not modify the input file. Report the row count before and after processing.
```

The second request is easier to review because it names the input, output, invariants, missing-value rule, mutation policy, and check. Those details form a specification. They do not guarantee correct code; they make correctness testable.

## Write the contract before accepting code

A contract is the short version of the specification you will test. Write it before adapting your expectations to whatever code the agent happened to produce.

```text
Task:
Inputs and required columns/types:
Output and required columns/types:
Invariants (what must remain true):
Missing-value and edge-case behavior:
Mutation policy:
Error behavior:
Out of scope:
```

For data work, useful invariants include row preservation, unique identifiers, allowed categories, stable units, and no unexpected mutation of the input.

## Verification ladder

Move up this ladder before trusting generated code:

1. **Read it.** Explain the inputs, transformation, output, and assumptions.
2. **Run a tiny case.** Use data small enough to calculate by hand.
3. **Compare with a known answer.** Derive the expectation independently.
4. **Test an edge case.** Try missing values, empty input, duplicate IDs, or a boundary value.
5. **Inspect side effects.** Check whether files, data, credentials, or the input object changed.
6. **Check documentation.** Verify package names, signatures, model IDs, and flags against a primary source.
7. **Record the evidence.** Preserve the prompt, raw output, failing test, repair, passing test, and remaining uncertainty.

Code running without an exception is only evidence that Python could execute that path. It is not evidence that the result answers the intended question.

## Small test patterns

Use expectations you can justify without copying the implementation's logic.

```python
assert len(result) == 3
assert set(result["status"]) <= {"open", "closed"}
assert result.loc[result["case_id"] == "C-01", "days_open"].iloc[0] == 2
```

For DataFrames, Pandas also supplies comparison helpers:

```python
import pandas as pd

before = source.copy(deep=True)
result = transform(source)
pd.testing.assert_frame_equal(source, before)  # input was not mutated
```

A weak test can validate the same mistake twice. If generated code uses a sum where the task requires a mean, do not calculate the expected value with the same generated aggregation. Use a hand-calculated value or a separately justified fixture.

## Repair from evidence

When a test fails:

1. Confirm that the test expresses the contract.
2. Confirm that it failed for the intended reason.
3. Change only the defect supported by the evidence.
4. Rerun the failing test and the rest of the test set.
5. Inspect the difference and reject unrelated changes.

Passing tests increase confidence only within the cases and properties tested.

## A trace is not yet a reproducible workflow

An agent conversation may show every command that ran. That trace is useful evidence, but it may live only in the application and may omit a reusable script. A collaborator opening the project should not need your chat transcript to discover how an output was made.

Preserve consequential work in files:

- a script or notebook with a clear run order;
- a `README.md` or `WORKFLOW.md` that records inputs and decisions;
- environment or package information;
- tests and known-answer fixtures;
- generated outputs that can be traced to code; and
- a short record of assumptions and unresolved problems.

Use a **fresh-start test**: open a new conversation or hand the folder to a teammate. Can the workflow be understood and rerun from the files alone? A mismatch is evidence that an instruction, dependency, or decision is still missing.

## Documentation and provenance

Prefer the project's documentation, an API provider's reference, or the package source. Search snippets and generated explanations can help locate a source but are not substitutes for it.

Record enough context for another person to review the work:

```text
Tool and model:
Date:
Task and prompt:
Files/data supplied:
Permissions granted:
Raw output preserved at:
Contract:
Tests and results:
Repair made:
Documentation checked:
Remaining uncertainty:
```

## Credentials, privacy, and cost

- Put keys in environment variables or an approved secret store, never in notebooks, prompts, screenshots, or commits.
- Do not send restricted, identifiable, or confidential data to a service unless that use is approved.
- Set limits on records, retries, tool calls, and output tokens before starting.
- Set a stopping rule for repeated failures or unexpected cost.
- Treat retries and autonomous loops as part of the budget.

Never use a real key in a classroom demonstration.

## Check the objective behind the metric

An agent may satisfy a poorly chosen target in a way that defeats the research goal. For example, "make prediction accuracy as high as possible" may invite target leakage, an inappropriate feature, or a trivial majority-class prediction. The agent did not necessarily disobey; the stated objective was incomplete.

Before asking for optimization, specify:

- when a prediction or decision is made;
- which information is available at that moment;
- a simple baseline;
- the error types that matter; and
- conditions that would make an apparently strong result unusable.

Research judgment determines what counts as success. A higher score is evidence to inspect, not permission to stop thinking.

## Two kinds of debt

**Technical debt** is future maintenance work created by brittle code or infrastructure: hard-coded paths, undocumented dependencies, no tests, hidden notebook state, or unnecessary complexity.

**Epistemic debt** is unresolved uncertainty about what the result means: an ambiguous construct, unexamined sample coverage, a label with no defensible definition, or a causal claim unsupported by the design.

Repairing the code can reduce technical debt without resolving epistemic debt. A perfectly tested function may still calculate the wrong concept.

## AI Usage Journal #3

Document one generated-code or agentic-workflow failure using this structure:

1. Tool, model, date, and task.
2. Original prompt and preserved raw output.
3. Contract written before acceptance.
4. The failing test and why it failed for the relevant reason.
5. The smallest repair and the passing evidence.
6. Any documentation checked.
7. Credentials, privacy, cost, and side-effect considerations.
8. Technical debt, epistemic debt, and remaining uncertainty.
9. When AI assistance was or was not appropriate.

Submit the required journal entry through bCourses according to the posted instructions.

## Before you accept generated code

- [ ] I can explain the inputs, outputs, and assumptions.
- [ ] The task has a clear stopping point and the agent's authority is appropriate.
- [ ] I preserved the prompt and raw response.
- [ ] Important decisions and run instructions are recorded in project files where someone can find them without the chat.
- [ ] I tested a hand-checkable case and a meaningful edge case.
- [ ] I checked mutation and other side effects.
- [ ] I verified uncertain package/API claims against a primary source.
- [ ] No secret or inappropriate data entered the prompt, notebook, or repository.
- [ ] I recorded evidence, changes, costs, and remaining uncertainty.
- [ ] My written claim does not exceed what the data and tests establish.

This guide incorporates selected exercises and principles from D-Lab's *Agentic AI for Research Workflows*, especially its distinction between chat and action, use of specifications, and fresh-start reproducibility check.
