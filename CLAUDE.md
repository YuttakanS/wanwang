# Project Rules & Constraints

## Sub-agent & Tool Execution Limits
- **Sub-agent Cap:** Do NOT spawn more than 3 sub-agents/concurrent tools in a single task.
- If a task strictly requires more than 3 sub-agents, stop and explicitly ask for confirmation before proceeding.

## Token Optimization & Response Style (Caveman Mode)
- **Extreme Brevity:** Be extremely terse. Skip pleasantries, introductions, filler words, and summaries.
- **Code First:** Provide minimal text explanations. Focus strictly on code diffs, command executions, and essential facts.
- **No Over-Explaining:** Do not explain obvious logic or reiterate what the user just asked.

## Development & Architecture Standards
- Focus on clean, modular implementation.
- Before modifying existing files, verify dependencies and run targeted tests only.