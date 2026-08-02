---
title: What We Found Inside a 1-Bit Model
date: 2026-08-02
description: >-
  An independent audit of Bonsai, the compressed 27-billion-parameter model Apple is
  reportedly evaluating — including the part where we turned out to be wrong.
---

*An independent audit of Bonsai — the compressed 27-billion-parameter model Apple is
reportedly evaluating — including the part where we turned out to be wrong.*

## Nobody had checked

PrismML took a 27-billion-parameter model of roughly 54 GB and compressed it into two shipped
products: a ternary edition at 7.6 GB, and a 1-bit flagship at 3.8 GB. Fourteen times
smaller, small enough to sit inside a phone's memory budget.

Every public number about it — quality, speed, memory — was the vendor's own. There was no
independent measurement of any of it that we could find. So we ran one, on a laptop, with our
predictions written down and locked before we looked at any result.

What follows is what we found, in the order we found it, including the experiment that
refuted us.

---

## Part 1 — Fact-checking the press release

Start with the checkable claims.

**The memory claim is true.** We measured 4.72 GB of peak memory against 5.2–5.9 GB claimed.
The vendor undersold itself. It really does fit the budget, and it deserves credit for that —
an audit that only reports the misses isn't an audit, it's a campaign.

**The speed claim doesn't reconcile with the vendor's own paperwork.** The launch statement,
widely quoted in the press, said 87 tokens per second. The company's current model card lists
66.4 as its best figure, with the acceleration trick that produces it disabled on Apple
silicon. Both numbers are theirs. They don't agree, and the press is still repeating the
larger one.

On our hardware, running the plain model with no acceleration tricks, we measured 22.2.

<figure>
  <img src="/figures/audit-speed-claim.svg" alt="Tokens per second: 87 in the launch statement, 66.4 on the vendor's current model card, 22.2 measured here." />
  <figcaption>Tokens per second: 87 in the launch statement, 66.4 on the vendor's current model card, 22.2 measured here.</figcaption>
</figure>

---

## Part 2 — Two products, two verdicts

The ternary edition's reputation rested on the vendor's own benchmark table, and the first
independent signals didn't obviously match it: a community Terminal-Bench 2.0 run put it at
7.9%, *below* a 9B reference model at 9.2%. A 27-billion-parameter model losing to a 9B is
the kind of result that makes people wonder whether a scoreboard is measuring anything.

Two explanations were available. Either its benchmark numbers were inflated, or the standard
metric was unfair to it. We tested which.

**It's the second.** Most of the apparent gap is a distribution-shift illusion: the model was
recovery-trained on a different mix of text than the corpus everyone scores it on, which
inflates the damage the standard metric reports. On real tasks it clearly beats a conventional
compression of the same size, at 19% fewer bytes. Its benchmark standing survives contact with
independent measurement.

But surviving is not the same as equal. On our harder 200-question exam, the ternary model sits
7 points below the uncompressed original (p = 0.007) — a real gap, and one that our first,
easier instrument had missed entirely.

The 1-bit flagship is a different story. It scores **12 points below its own less-compressed
sibling** (p = 0.001, and p < 0.0001 on the 200-question exam). That is a genuine quality
deficit, and it is not something the marketing mentions.

<figure>
  <img src="/figures/audit-five-models.svg" alt="Score of 78 in fast-answer mode: uncompressed original 67, a conventional 8B at 4-bit 67, the ternary edition 65, a conventional 2-bit quant 57, the 1-bit flagship 56." />
  <figcaption>Score of 78 in fast-answer mode: uncompressed original 67, a conventional 8B at 4-bit 67, the ternary edition 65, a conventional 2-bit quant 57, the 1-bit flagship 56. These are raw item counts on one instrument; the 12-point figure above is on the audited completed-answer basis, which is why the gap here reads as 11 items rather than 12.</figcaption>
</figure>

There was a wrinkle we should be honest about. When we first found the vendor's published
quality *ordering* reversed on the standard perplexity metric, the ordering that came back
was not theirs. That result turned out to be mostly the distribution-shift artifact above —
which is why a single metric, however standard, is not an audit.

---

## Part 3 — The regime where the damage hides

Then we found something that reframed the whole thing.

Modern models have two modes. They can answer immediately, or they can "think" first —
generating hundreds of words of private reasoning before replying. We had run the entire audit
in fast-answer mode.

We reran it in thinking mode. **The compressed flagship scores 97%.** The 12-point deficit
almost vanishes.

So we isolated why, with a four-way control that separated *room to answer* from *permission
to deliberate*. Extra room alone bought +3 points. Deliberation bought **+17**. It really is
the thinking, not the token budget.

<figure>
  <img src="/figures/audit-regime.svg" alt="The 1-bit flagship scores 56 of 78 answering fast, 59 given more room, and 76 when allowed to deliberate." />
  <figcaption>The 1-bit flagship scores 56 of 78 answering fast, 59 given more room, and 76 when allowed to deliberate.</figcaption>
</figure>

The vendor's benchmarks run in thinking mode. **Their number wasn't a lie.** Ours wasn't
either. We had measured different regimes and produced two true, contradictory-looking
results — and neither spec sheet nor press release names the axis that separates them.

Which regime matters depends on where the model runs. Thinking costs up to 1,500 hidden words
per answer: at this model's measured speed, about a minute of silence, plus the battery to
produce it. On a phone, fast-answer mode *is* the mode. And that is exactly where the
12-point deficit lives, at full strength.

A footnote in the same spirit: the deliberation effect is not universally good. A
full-precision 8B control model *backfires* when thinking is given too little room — it drops
12 points at a tight budget, because the reasoning consumes the space before the answer
arrives. The compressed flagship gains 5 points under the same conditions. Even the fix has a
regime.

---

## Part 4 — We went looking for the damage, and were wrong

By this point we had a deficit and no anatomy. Where in the model does it live?

We had a suspect. PrismML compressed the flagship's **vocabulary matrices** — the lookup
tables that map words to numbers and back — down to 1 bit, along with everything else. That
runs against conventional wisdom, which holds that embeddings are sensitive and should be
spared. It looked like an obvious leak.

So we built the tools to test it: a way to cut and splice vocabulary in a finished model file.
Then we transplanted sharp, high-precision vocabulary from the uncompressed original into the
compressed body. Predictions locked in advance.

**The transplant made the model worse** — 48 versus 56 out of 78 (p = 0.039), in the wrong
direction.

<figure>
  <img src="/figures/audit-transplant.svg" alt="Score of 78: the flagship untouched scores 56; with high-precision vocabulary transplanted in, 48." />
  <figcaption>Score of 78: the flagship untouched scores 56; with high-precision vocabulary transplanted in, 48.</figcaption>
</figure>

Their aggressive choice cost nothing measurable. The deficit lives deeper, in the body of the
model, where only training reaches. **Their engineers were right and we were wrong**, and
that miss is published here with the same prominence as anything we got right.

The interesting part is what we saw on the way. Reading the compressed weights against the
original revealed that **the company's two products are built by different recipes.** The
ternary edition's vocabulary was genuinely retrained — it carries the statistical signature of
training, its values drift further than rounding alone could move them, and its scale factors
are off by a factor of three from a rounded copy. The 1-bit flagship's vocabulary was simply
rounded: near-pure copies of the base model, ~98% sign agreement, no training signature at all.

Two shipped products from one company, two different pipelines at the same component. That is
a fact about how these models are made, extracted from public files, and as far as we can tell
nobody outside the company had published it.

One more result from the same experiment, because it is the sharpest example of the theme
running through all of this work: a single swap made the model's perplexity — the number the
whole field quotes — **182% worse while its actual answers got slightly better.**

---

## Part 5 — What makes an audit worth anything

An audit is only as good as its willingness to find its author wrong. So the last section is
about us.

We built the same vocabulary-trimming tool into a product: cut ~105,000 unused entries — every
Chinese, Cyrillic and Arabic token an English deployment never touches — out of a model that
otherwise doesn't fit on consumer hardware. Our everyday 78-question exam said the trim was
free. Two answers lost out of 78, no statistical signal, p = 0.50. A generic benchmark would
have shipped it.

We ran a second instrument anyway: 36 questions deliberately aimed at accented names,
non-English text, and the characters the trim removes. The trimmed model failed in four
distinct ways — and in one of them, asked about a Polish author, **it invented a person**,
giving a fabricated name and a fabricated birth name.

Same model. Same trim. Same day. One instrument called it free; the other found a
hallucinated human being.

Then the method caught us properly. A day before we planned to upload our own flagship
artifact, the rare-character probe scored our shipping candidate **15 out of 30** against the
untrimmed original's 30 out of 30. Our everyday exam had called that trim cosmetic. It wasn't
looking for this failure, so it didn't find it. We wrote down the fix and the predicted
outcome before touching the model, rebuilt it, and got **29 out of 30 for 106 MB** —
confirmed on three machines across two graphics-card vendors.

<figure>
  <img src="/figures/audit-two-instruments.svg" alt="Rare-character probe, score of 30: untrimmed original 30, our shipping candidate 15, after the 106 MB fix 29." />
  <figcaption>Rare-character probe, score of 30: untrimmed original 30, our shipping candidate 15, after the 106 MB fix 29.</figcaption>
</figure>

*Honest footnote, in the same spirit as the rest:* the headline p-value that made the
trim damage "statistically established" rested partly on one item we later found was an
ungradable abort rather than a wrong answer. Excluded, it misses significance. The
fabrication was never in doubt; the significance claim was contingent, and it says so here.

---

## The conclusion

The vendor was right about memory. The press is repeating a speed number the vendor's own
documentation no longer supports. The 1-bit flagship carries a real quality deficit that its
marketing doesn't mention — and that deficit largely disappears in the regime the vendor
benchmarks in, and returns at full strength in the regime a phone actually uses. The
aggressive design choice we expected to be the culprit turned out to be fine.

None of that is knowable from a model card. Every one of those findings required someone
outside the company to measure, on real hardware, with the predictions locked first — and to
publish the experiments that came back against them.

"We didn't find damage" is not the same claim as "there is no damage." The distance between
those two sentences is the entire job.

---

*Methods: model-vs-model comparisons use exact McNemar tests on paired items, reporting
discordance counts; per-category scores at n=12 are diagnostic, never claims. Perplexity
figures are full-corpus. Quality verdicts are qualified per backend and performance per
device, because we measured both changing. Vendor and press figures are identified as such
and were not independently verified except where stated. Preregistrations, adjudications,
raw result files and analysis scripts are retained for every experiment cited.*
