# Turing Proof Lab

An interactive, Korean-language theory of computation portfolio project. Explore closure constructions for decidable languages and a mapping reduction from A_TM to detecting three consecutive left moves.

## Run locally

Requires Node.js 20 or newer. No package installation or API key is needed.

```sh
git clone https://github.com/MinseoK2626/TuringMachineProof.git
cd TuringMachineProof
npm run dev
```

Open **http://localhost:3000** on the same machine. `PORT=8080 npm start` selects another port. In remote development, forward the selected port using your editor's port-forwarding feature. The repository must first contain these files on GitHub before the clone instructions work.

```sh
npm test
```

Tests enumerate binary words through length 7, check all three-macro boundaries, preserve head displacement, and verify safe initialization. The project uses plain HTML, CSS and JavaScript; no build step is required. System font fallbacks work offline without external font requests. To deploy on a static host, publish `index.html`, `style.css`, `app.js` and `logic.js` together in the same directory (including a GitHub Pages project path). No backend is required by the application.

## Mathematical scope

- The closure panel uses two total example deciders over Σ = {0,1}: A accepts words ending in 0; B accepts words with an odd number of 1s. Union, intersection and complement use their Boolean decisions. Concatenation considers all n+1 boundaries, including empty pieces. Star considers all nonempty-piece partitions, treating ε as the zero-piece concatenation. The input limit of 12 is a visualization safeguard, not a restriction of the theorem.
- The explanations prove the constructions for arbitrary **deciders**, not just these example languages. Finitely many terminating calls establish termination; finite does not imply efficient.
- LEFT₃ is the set of encoded machine/input pairs whose physical move sequence contains LLL. The model uses a two-way infinite tape and directions L, R and optionally S. A_TM asks whether M **accepts** w, rather than whether M merely halts.
- The reduction builds N with hardcoded M and w, ignoring its own input. It writes w using R moves. For nonempty w of length n, it returns to the origin by R followed by (LRL)^(n+1); all intermediate transitions preserve tape contents. Empty w needs no initialization. It simulates each original move using L→LRL, R→R, S→RL. The first transition writes the original symbol, and intermediate moves preserve scanned symbols. State transitions occur at macro completion. Each macro has at most one L at either end and no internal LL; a run of three Ls cannot cross macro boundaries. Auxiliary states and symbol-dependent preservation transitions form a finite, effectively constructible table.
- N executes RLLL only if the simulation accepts, halts without that signal on rejection, and continues safe simulation on nontermination. Thus ⟨M,w⟩∈A_TM iff ⟨N,ε⟩∈LEFT₃. A hypothetical LEFT₃ decider would decide A_TM, a contradiction.
- The reduction panel animates **scripted example traces**, not arbitrary machine descriptions or a universal TM. Its tape is a head-position visualization, not a tape-content simulator. The loop scenario is labeled as a finite prefix; observing no LLL for finitely many steps never proves absence forever. Formal reasoning establishes the general result.

## Project structure

- `logic.js`: executable closure decisions and safe movement compilation
- `app.js`: interactive views, trace stepping and concept check
- `logic.test.js`: mathematical invariants and boundary cases
- `server.js`: dependency-free local static server

The work is not a proof-assistant formalization. It combines constructive mathematical arguments with executable examples and invariant tests.

## GitHub Pages deployment

In repository Settings → Pages → Build and deployment, choose **GitHub Actions** as the source. The included workflow tests the project and publishes only the four public app files on each push to `main`. The expected URL is https://MinseoK2626.github.io/TuringMachineProof/ after a successful deployment. No secrets or npm dependencies are required.
