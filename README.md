# Turing Proof Lab

An interactive theory-of-computation portfolio tool that connects constructive proofs to executable algorithms. English interface, plain JavaScript, no runtime dependencies or API keys.

## Run

Requires Node.js 20 or newer.

```sh
git clone https://github.com/MinseoK2626/TuringMachineProof.git
cd TuringMachineProof
npm run dev
```

Open http://localhost:3000 on the same machine. `PORT=8080 npm start` selects another port. In remote development, use your editor's port forwarding.

```sh
npm test
```

## Computational experiments

Explore five explicit language algorithms: equal counts, repeated words, binary palindromes, even parity, and ordered blocks (0*1*). Enumerate all short inputs, choose a transition budget, and check completed results with independent predicates. Unknown executions remain separate from rejected inputs.

Switch between physical transitions, left/right moves, changed-symbol writes and tape span. Analyze all completed inputs, accepted inputs, or rejected inputs. Missing groups remain missing; unfinished executions are excluded from completed-run averages and may introduce selection bias. Compare individual inputs, filter the dataset, export raw CSV, and inspect generated machines in the debugger.

The project connects model specification, dataset generation, validation, measurement, visualization and interpretation. Finite experiments support implementation checks; they do not establish unrestricted correctness or asymptotic complexity.

## What a reviewer can do

1. Explore union, intersection, complement, concatenation and star using two example decidable languages.
2. Open the implementation lab, choose different total deciders (including languages containing ε), and step through the actual closure algorithm. Observe function calls, failed candidates, successful witnesses and the source line that yielded each event. Export the concrete execution as JSON.
3. Edit a deterministic Turing machine as a JSON transition table. Compile it into a new machine N for the reduction A_TM ≤m LEFT₃. Inspect the generated auxiliary states and trace each rule back to its source transition.
4. Execute N one physical move at a time or in batches. Compare the tape, head and mapped source state with M at simulation boundaries. Observe actual tape writes rather than a predetermined animation. Export N, its source and its bounded execution.
5. Inspect the engineering notes, source links and invariant tests to understand implementation choices and their limits.

## Architecture

| File | Responsibility |
| --- | --- |
| `experiments.js` | Experiment machine constructors, independent labels, exhaustive input enumeration, physical-step measurement and CSV export |
| `experiments-ui.js` | Experiment protocol, measured chart, filtering, controlled comparison and debugger handoff |
| `experiments.test.js` | Exhaustive agreement for all inputs through length seven across five algorithms, edge cases and measurement consistency |
| `dfa.js` | Total DFA validation, product construction, BFS decision, independent certificate verification |
| `dfa-ui.js` | Editable DFA explorer, live reachability search, witness and word traces |
| `dfa.test.js` | Exhaustive two-state DFA decisions, shortest witnesses and tamper detection |
| `logic.js` | Example total deciders and all-candidate closure evaluator |
| `proof-engine.js` | Closure execution generator, machine validation, finite reduction compiler, sparse-tape interpreter |
| `app.js` | Introductory closure explorer and concept check |
| `workshop.js` | Source debugger, editable machine lab, configuration comparison and export |
| `logic.test.js` | Closure characterizations and movement-macro boundary properties |
| `proof-engine.test.js` | Independent closure checks and full compiled-execution invariants |
| `server.js` | Dependency-free local static server with an explicit public-file allowlist |

The code panel renders `closureProgram.toString()`. Runtime events come from that same generator; the highlighted lines are not separately maintained pseudocode. The program stops on its first successful witness. The introductory explorer deliberately evaluates all candidates to display possible witnesses.

The compiler never executes M to discover its outcome. It constructs a finite transition table with collision-free state names and source-rule metadata. A `Map` stores the nonblank tape cells at integer positions. Only simulation boundaries, rather than intermediate auxiliary states, are expected to match the original configuration.

## Machine format

```json
{
  "alphabet": ["0", "1", "_"],
  "start": "q0",
  "accept": "yes",
  "reject": "no",
  "transitions": [
    { "from": "q0", "read": "1", "write": "0", "move": "L", "to": "yes" }
  ]
}
```

The model has a two-way infinite tape. `_` is blank. Rules are deterministic; missing rules reject. Accept and reject states halt and cannot have outgoing rules. `S` means a stationary move. Inputs contain nonblank alphabet symbols. The editor allows at most 100 source rules and 10 alphabet symbols; the word limit is 32. Execution stops at a 2,000-step **observation budget**, with the outcome explicitly unknown if the machine has not halted. No arbitrary code is evaluated from the editor.

## DFA property decision lab

Edit a total DFA A. Build its product C with the two-state DFA recognizing odd counts of the literal symbol `1` (other symbols preserve parity). The property is `M_DFA = {⟨A⟩ | A accepts no word with an odd number of 1s}`. Breadth-first search either reaches an accepting product state and reconstructs a shortest counterexample, or exhausts the frontier and certifies the intersection is empty. Unlike bounded TM observation, exhaustion of this finite graph is conclusive.

The view displays the real product states, transition table, frontier, events and executed source. Click a product state to inspect its outgoing edges. Edit A, trace an individual word, or export the decision artifact. Invalid or incomplete DFA descriptions are rejected before construction. Alphabets may contain symbols beyond 0/1, and may omit 1 entirely.

`verifyCertificate` separately checks negative decisions by simulating the witness and checking odd parity; positive decisions use a set containing the start state, closed under all transitions and free of accepting product states. Tests compare every binary two-state DFA (including every accepting set and start state) against the finite shortest-witness bound, and exercise malformed encodings, unreachable states, ε, and certificate tampering.

## Mathematical construction

### Closure of decidable languages

Union and intersection combine Boolean results of total deciders. Complement swaps acceptance and rejection. Concatenation checks all n+1 splits, including empty pieces. Star accepts ε as a zero-piece concatenation; for n ≥ 1, it searches the 2^(n−1) partitions into nonempty pieces. Empty factors can be removed even when ε belongs to the base language. Each search is finite and each decider call terminates, so each construction is a decider. The basic visualization caps input at 12 symbols; the source debugger caps it at 10. These limits are UI safeguards, not restrictions of the theorem.

### A_TM ≤m LEFT₃

LEFT₃ contains ⟨M,w⟩ exactly when the physical move sequence of M(w) contains three consecutive L moves. A_TM asks whether M **accepts** w, not merely whether it halts.

Given ⟨M,w⟩, construct N to run on the blank input ε:

1. Write the hardcoded w using R moves. If n = |w| > 0, return from position n to the origin with R followed by n+1 copies of LRL. For ε, use a harmless RL pair. Initialization preserves the stored input and cannot contain LLL.
2. Simulate each original rule with L→LRL, R→R, S→RL. The first physical transition writes the original rule's symbol; intermediate transitions preserve the symbols they scan. At macro completion, the tape, head and mapped state equal the source configuration. Each macro has at most one L at either end and no internal LL; even crossing several macro boundaries cannot produce LLL.
3. Only upon simulated acceptance execute RLLL and accept. On rejection, reject without the signal. A missing source transition also leads to rejection. Nontermination continues safe simulation.

Thus ⟨M,w⟩ ∈ A_TM iff ⟨N,ε⟩ ∈ LEFT₃. This effective finite transformation would let a hypothetical LEFT₃ decider decide A_TM, a contradiction. N's behavior on nonblank inputs is irrelevant to the reduction; the generated pair always uses ε.

## Validation and limits

`npm test` runs the unit tests covering independent language characterizations, custom total deciders, ε, every pair of source moves and write symbols, actual tape writes, macro-boundary configuration equality, initialization for short binary words, initially halting states, missing rules, malformed inputs and deterministic generated transitions. The loop preset is a known right-moving machine; its observed prefix alone is never presented as a general nontermination proof.

A Chromium smoke test also exercises source highlighting, closure verdicts, compiled accept/reject/loop traces, invalid JSON, ε and mobile overflow. With the server running, execute `npm run test:browser`. Set `CHROMIUM_BIN` if Chromium is not at `/usr/bin/chromium`. It uses local DevTools port 9333 and writes screenshots under `/tmp`. This optional browser check is separate from the portable unit tests.

This is an executable proof exploration tool, not a proof-assistant formalization. Tests validate finite cases and implementation invariants. The mathematical arguments establish the unrestricted results. Exported TM and closure traces are reproducible artifacts, not formal proof certificates. The DFA lab additionally exports finite witnesses or inductively closed reachable sets checked by a separate verifier; these are not proof-assistant formalizations.

## Deployment

In repository Settings → Pages → Build and deployment, select **GitHub Actions**. The included workflow tests the project and publishes its ten public app files on pushes to `main`. Static hosting needs `index.html`, `style.css`, `app.js`, `logic.js`, `proof-engine.js`, `workshop.js`, `experiments.js`, `experiments-ui.js`, `dfa.js` and `dfa-ui.js` in the same directory; no backend or build step is needed. Relative asset paths support the project URL:

https://minseok2626.github.io/TuringMachineProof/

### Measurement protocol

The balance alphabet is `{0,1}`; the copy alphabet is `{0,1,#}`. Length includes the separator. The dataset contains every word of each included length, including ε and malformed separators. Each row includes word, length, observed outcome, independent expected label, agreement, physical transitions, L/R/S counts, changed-symbol write operations, and tape span (including the initial input extent). The selected safety budget is 25, 100, 1,000 or 10,000 transitions per word. Unknown runs are counted separately, never relabeled as rejection. Each chart point weights words equally within that length; no runtime timings, random sampling, or curve fitting are used. Since alphabets and acceptance distributions differ, cross-task averages are not controlled algorithm comparisons. Empirical growth is not an asymptotic proof.
