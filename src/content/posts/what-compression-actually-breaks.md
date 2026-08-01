---
title: What Compression Actually Breaks
date: 2026-08-01
description: >-
  Fourteen experiments in shrinking language models to fit consumer hardware —
  and the one number that went the wrong way.
---

*Fourteen experiments in shrinking language models to fit consumer hardware — and the one
number that went the wrong way.*

## The dream, and the catch

A leading open language model needs about 54 GB to run at full size. A phone can spare
maybe 6 GB. Closing that gap is the entire premise of on-device AI: private, offline,
instant, no cloud round-trip and no server bill.

Closing it is also trivially easy. Compressing a model — *quantization*, storing each of its
billions of weights with less precision — takes thirteen seconds and a free tool. Anyone can
do it this afternoon.

Knowing what you just broke is the hard part. It is unpredictable, it has structure, and it
takes real measurement. Nobody sells that knowledge. So we spent a month building it,
starting by breaking our own models on purpose.

Every experiment below was **preregistered**: predictions written down and locked before we
looked at the results, so we couldn't quietly move the goalposts. Several of them refuted our
own predictions. Those are the interesting ones.

---

## Part 1 — Damage has a shape

Compression is rounding. A model is billions of numbers; compression forces each onto a
small menu of allowed values. Four-bit gives each weight sixteen options — gentle, almost
nothing breaks. Two-bit gives it four. Ternary gives it three (−1, 0, +1). One-bit gives it
essentially two, the most extreme rounding practically possible.

We shrank a model to the harshest setting we tested and handed it a hand-checked exam. The
damage was not diffuse. **Formatting survived intact — 6 of 6, even at 2-bit. Facts and
arithmetic broke first, every time, at every scale we tried.** A heavily compressed model
doesn't get vaguer; it gets confidently wrong about specifics while its prose stays clean.
That is a much more dangerous failure mode than degradation, and it is invisible to anyone
eyeballing outputs for fluency.

Then we asked whether size protects you. The industry intuition is that bigger models absorb
compression more gracefully. We ran the harshest setting across three sizes of one model
family:

| Model size | Perplexity damage at 2-bit (full-corpus) |
|---|---|
| 0.5B | +10.0% |
| 1.5B | **+51.1%** |
| 3B | +37.1% |

Damage *grew* with scale below 7B, and non-monotonically. The smallest model was the least
damaged of the three. "Bigger quantizes easier" is method-specific folklore, not a law — and
you cannot look this up. You have to measure it on your model, at your size.

We also found something free. Before compressing, you can run sample text through the model,
watch which weights actually do the work, and protect those. It's called calibration, it
takes minutes, and it costs nothing at runtime. At 2-bit it more than doubled code scores
(2/12 → 5/12) — on *any* text. But calibrating on code versus ordinary prose made no
measurable difference at our sample size. "Tell us your workload and we'll aim the
compression at it" is an appealing product. It is not yet proven. We shelved it and said so.
(n=12 — diagnostic, not a claim, by our own convention.)

---

## Part 2 — The number that went the wrong way

Our first experiment produced a clean trade: **3.05× smaller, 2.4× faster to generate an
answer, for +10.0% on the raw prediction metric** (full-corpus). Exactly the bargain the
field advertises.

Then one number moved the wrong way. The compressed model took *longer* to read the prompt
than the full-size model did. Smaller and slower at the same time — arithmetically odd, and
not something the theory allows.

We reran it on a graphics chip instead of a processor. **The anomaly reversed completely.**
Nothing about the model had changed; only the code that executes it. The penalty was an
artifact of one dequantization kernel on one backend.

That single stubborn number became the thread we pulled through the rest of the lab, all the
way to a second hardware vendor and a second inference engine. It is the reason this paper
has a Part 4.

---

## Part 3 — Compression is a systems problem

Quality does not live in the model file. It lives in the file *plus* the documents you hand
it, the working memory it keeps, and the machine underneath.

**Reading degrades last.** Hand a model a document and ask about it. Across every model and
compression level we tested, answering from the page held at 10–12 out of 12 — while
memorized knowledge collapsed at those same settings. In the five-model flagship audit:
60 of 60 passes, zero counterfactual overrides, reproduced on a full clean re-audit of our
own capture pipeline and on three devices across two GPU vendors. It is the most robust
finding.

*Not never*, though. At the edge — the smallest model at the harshest setting, 1.5B at
2-bit — we found one genuine override, where the model answered from memory against the
document in front of it. Reading degrades **last**, not infinitely.

That asymmetry suggests an architecture, so we tested it. We attached a local document
store — 1.1 MB, smaller than one photo — to compressed models and re-asked the fact
questions they had failed closed-book:

| 1.5B model, 2-bit | Fact questions (of 18) |
|---|---|
| Closed-book | 5/18 |
| **+ library** | **18/18** |

That compressed 1.5B, with its 1.1 MB library, beats the full-precision **3B** model's own
closed-book memory (16/18) at 9× smaller. The same rescue held at 3B and at 27B scale. Cost:
+0.4 seconds per question.

Then we tried to break it, and succeeded. We repeated the trick with a **generic** store —
documents nobody wrote for our test:

| 3B model, 2-bit | Fact questions (of 18) |
|---|---|
| Closed-book | 8/18 |
| + generic library | **7/18** |
| + curated library | **17/18** |

Same mechanism, same model, and the rescue swings from **0% to 100% purely on store
content**. Worse, leaving retrieval always on cost 2–3 points on unrelated coding tasks — a
distraction tax. A router that retrieves only when a question looks library-shaped recovered
that tax in full.

"Facts in the database, skills in the model" works. But RAG is not a feature you switch on;
it is a system whose value is determined by decisions — which store, which router, which
queries — that are all measurable, and none of which are answered by the model card.

The same lesson appears in working memory. Every conversation sits in a KV cache, separate
from the weights, and it can be compressed too. At 4-bit working memory:

| Model | Score of 18 |
|---|---|
| 3B · 2-bit weights | **1/18** (from 18/18 at 8-bit) |
| 8B · 4-bit weights | 15/18 (from 17) |
| 27B · 1-bit hybrid | 13/18 (unmoved) |

The hardest-compressed model collapses outright; the mildly compressed one wobbles; the
hybrid-attention flagship doesn't notice. **Tolerance for compressing working memory inverts
with weight precision.** Eight-bit working memory is free everywhere; below that, our three
models behaved wildly differently — and since they differ in architecture as well as size,
these are three case studies, not a law. The point survives either way: no spec sheet
predicts this.

---

## Part 4 — The instruments lie, and the machine changes the answer

Vendors quote perplexity when they claim "90% retained." We asked what perplexity is worth.

We rented $10 of GPU time and ran cheap recovery training on our worst-damaged model, with
predictions locked beforehand. It repaired **44% of the damage on perplexity — but only
20–40% on the real exam, and 0% on facts.** The metric everyone reports recovers about twice
as fast as the ability anyone actually wants. That 2:1 gap is the finding, and it means a
published retention percentage systematically flatters the model that earned it.

Then the thread from Part 2 paid out. We reran the full audit on additional hardware:

- **390 / 390 answers byte-identical** on a second Apple machine — same backend, same ISA.
- **16 / 390 answers changed** on a different GPU vendor, 4 of them flipping a grade. Same
  software build on both sides, so this is floating-point reduction order in the kernels, not
  software drift. (In one case the *divergent* machine was the correct one.)

Quality conclusions travel between similar machines and **stop at the vendor boundary**.

Energy never travelled at all. Same files, same software, two Apple machines one generation
apart (SoC-estimate tokens/joule, same-device A/B only):

| | FP16 | Q4 | Q2 |
|---|---|---|---|
| M5 | 5.02 | 4.56 | **4.01** — shrinking makes it faster but *less* efficient |
| M4 | 1.98 | 3.56 | **3.78** — shrinking makes it faster *and more* efficient |

The efficiency verdict inverts between two chips from the same vendor.

The last case is the sharpest. A "mixture of experts" model splits its parameters into 128
specialists and wakes 8 per word — on paper the ideal phone architecture, 30B of knowledge
for 3B of work. Every GPU configuration we tried failed: three crashed out of memory, one ran
30× slower than using no GPU at all. The offload feature demonstrably moves 16.7 GB out of
GPU memory, and the driver still demands the full amount. It looks like an engine bug. On the
processor alone the model generates text *faster than a smaller dense model does on the GPU* —
sparsity is real — but it needs 3× the memory, is ~18× slower to read a prompt, and ties on
our exams. An architecture's advantage is only as real as the software that serves it.

---

## What it means

Fourteen experiments, and the through-line is the same each time: **the number you would
normally trust does not predict the thing you actually care about.** Perplexity flatters
recovery 2:1. Scale doesn't protect. Tokens per second doesn't predict time-to-answer.
Efficiency inverts between chip generations. A spec sheet doesn't tell you whether the
architecture will even load.

So the verdicts have to be scoped honestly. **Quality must be qualified per backend.
Performance, per device.** And because the answer changes every time the model, the runtime,
or the chip does, it isn't a one-off certificate — it is a measurement that has to be rerun.

Compression takes thirteen seconds. Knowing what it cost you is the part nobody sells.

---

*Methods: all comparisons on paired items with exact McNemar tests; per-category scores at
n=12 are reported as diagnostic, never as claims. Perplexity figures are full-corpus unless
stated. Energy figures are SoC estimates, valid for same-device A/B only. Preregistrations,
adjudications, raw result files and analysis scripts are retained for every experiment cited.*
