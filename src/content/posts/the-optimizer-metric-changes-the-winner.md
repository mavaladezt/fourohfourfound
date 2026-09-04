---
title: The Optimizer Metric Changes the Winner
date: 2026-09-04
description: >-
  We tested ways to make language-model training use less memory on one consumer GPU.
  One optimizer removed three quarters of its state but a tenth of peak memory; another
  reached a target earlier on slower steps; matched-learning-rate controls shrank our
  cleanest apparent quality gain to a tuning effect.
---

_We tested ways to make language-model training use less memory. One optimizer removed three quarters of its state but only one tenth of peak memory. Another reached a target one evaluation interval earlier while running slower steps. Three matched-learning-rate controls showed that our cleanest apparent quality improvement was largely a tuning effect._

## The result that looked better than it was

The first long run looked decisive.

Our 8-bit AdamW model finished at validation loss **0.826**. Ordinary AdamW finished at **0.887**. Across three held-out seeds, the mean difference was −0.071, with the entire paired interval below zero.

<figure>
  <img src="/figures/optimizer-heldout-trajectories.svg" alt="Mean held-out validation loss versus tokens over the 5,000-step confirmation runs, three seeds per optimizer, on the byte-level TinyStories protocol." />
  <figcaption>Mean held-out validation loss versus tokens over the 5,000-step confirmation runs, three seeds per optimizer, on the byte-level TinyStories protocol.</figcaption>
</figure>


That is not noise on this instrument. We had already measured the instrument.

It was also not yet an optimizer result.

The 8-bit optimizer had selected a learning rate of `6e-4`. Our frozen AdamW baseline used `3e-4`, the winner of its original coarse search. So we ran ordinary AdamW at the candidate’s learning rate using all three held-out seed/data orders.

The matched-LR paired differences—8-bit minus ordinary AdamW—were **+0.00369, +0.01712 and −0.00493**. Their mean was **+0.00529**, with a 95% interval of **[−0.02230, +0.03289]**. Directions were mixed, and the interval contains both plausible benefit and harm.

The earlier apparent gain was therefore substantially confounded by learning-rate selection. The controls did not show a quantization benefit, but their interval was also too wide to establish equivalence.

That did not make the experiment useless. It narrowed what the optimizer demonstrably purchased: not established free quality, but clearly measured memory.

## State is not memory

AdamW keeps two histories for every parameter: a running average of gradients and a running average of squared gradients. In our 14.6-million-parameter model, those histories occupied **116.7 MB (111.3 MiB)**.

The bitsandbytes implementation stored most of them in 8-bit form. Its unique physical state occupied **29.9 MB (28.5 MiB)**—**74.4% less**.

Peak allocated GPU memory fell by **10.9%**.

Both numbers are true. They answer different questions.

<figure>
  <img src="/figures/optimizer-state-versus-peak.svg" alt="Persistent optimizer state and peak allocated VRAM, in MiB, for AdamW, 8-bit AdamW, Muon and NorMuon. State is the short bar; peak is the tall one." />
  <figcaption>Persistent optimizer state and peak allocated VRAM, in MiB, for AdamW, 8-bit AdamW, Muon and NorMuon. State is the short bar; peak is the tall one.</figcaption>
</figure>


Optimizer state persists between steps. Peak memory also contains the model, gradients, activations, temporary workspaces and allocator behavior. Compressing one component by three quarters cannot compress components it never touched.

The distinction matters because “74% less optimizer memory” easily becomes “74% less memory” by the time it reaches a headline. On our machine the latter would be wrong by about a factor of seven.

The runtime result had the same shape. The 8-bit implementation uses fused conversion kernels, not our earlier slow Python quantizer. Even so, synchronized training was about **3% slower** than the frozen AdamW runs on this GPU. The common 292 W policy allowed completion, but intermittent hotspot-throttling flags remained, so this is specific to this card and cooling regime. It is not a universal speed result.

There are two extra methods footnotes. First, the official ROCm wheel did not include the RX 6900 XT’s `gfx1030` target. It imported, constructed the optimizer, and segfaulted on the first update. We built the pinned source for the card, recorded the source and native-library hashes, and verified an exact next update after save/resume with real uint8 state. This is a working local result through a disclosed unsupported path, not evidence about every AMD GPU.

Second, this is bitsandbytes v0.49.2 as invoked on our ordinary GPT—not the complete 2022 language-model recipe. We retained normal embedding modules, and sufficiently large embedding states were quantized rather than protected in FP32 through StableEmbedding.

## Fewer tokens can take more time

The second survivor was NorMuon.

Muon orthogonalizes momentum matrices before updating hidden layers. NorMuon adds a neuron-wise adaptive statistic after that orthogonalization. On our held-out runs, NorMuon finished at losses **0.657, 0.662 and 0.662**. Muon finished at **0.687, 0.686 and 0.685**.

The paired difference was −0.0255, with a 95% interval from −0.0345 to −0.0166. Every seed moved in the same direction.

<figure>
  <img src="/figures/optimizer-paired-differences.svg" alt="Seed-level paired validation-loss differences with 95% t intervals (n=3). The 8-bit AdamW row is at separately tuned learning rates; the matched-LR control is reported in the text." />
  <figcaption>Seed-level paired validation-loss differences with 95% t intervals (n=3). The 8-bit AdamW row is at separately tuned learning rates; the matched-LR control is reported in the text.</figcaption>
</figure>


At the fixed validation checkpoints, NorMuon was first observed below loss 0.70 at 9.216 million tokens. Muon was first observed below it at 10.24 million—one 1.024-million-token evaluation interval later in every seed.

NorMuon’s steps were also about **19.4% slower**.

So “NorMuon trains more efficiently” needs a denominator. It required fewer observed tokens to the checkpoint target, but the slower steps mean a wall-time advantage cannot be inferred without paired cumulative crossing times. The published NorMuon system uses a different distributed implementation, so our timing does not refute its datacenter result. It identifies the axis on which our answer may change.

## The larger byte-level screen strengthened one result, not both

We repeated the comparison with three new seed/data-seed pairs on a 38.4-million-parameter model—2.63 times the original parameter count—without retuning. This remained the same byte-token TinyStories domain, so it tests modest scale robustness rather than external validity.

NorMuon again beat Muon in every pair. Its mean endpoint difference was **−0.10598**, with a 95% paired interval of **[−0.12673, −0.08522]**. It was first observed below loss 1.15 one 512,000-token evaluation interval earlier, although its steps were 26.4% slower and the crossing remains interval-censored.

The matched-LR 8-bit AdamW result was much less decisive: mean difference **−0.01583**, 95% interval **[−0.09007, +0.05841]**, with mixed directions across seeds. Its systems benefit did replicate—74.45% less optimizer state and 14.25% less peak allocated memory, with effectively unchanged median step time—but the quality interval supports neither improvement nor equivalence.

## Standard tokenization changed the practical frontier

We then moved to pinned GPT-2-tokenized FineWeb-Edu and a 52.99-million-parameter model. The larger untied vocabulary embeddings materially changed where optimizer memory lived. Following the declared policy, the 8-bit arm kept input, position and output-head optimizer states in FP32 while quantizing eligible hidden states.

Quality remained extremely close across three paired seeds: 8-bit AdamW minus AdamW was **+0.000128**, with a 95% interval of **[−0.000397, +0.000652]**. This is strong local precision but not a formal equivalence test. More importantly, state savings fell to **19.93%** and peak-allocation savings to **3.55%**, missing the preregistered 50% and 5% promotion gates. The mechanism preserved quality locally but no longer purchased enough practical memory to advance.

NorMuon also remained directionally better than Muon in every pair, but the mean gain shrank to **0.00344**, below the declared `>0.01` gate. Its steps were **15.36% slower** with effectively identical memory. Neither candidate advanced to the 5,000-step held-out stage.

This was the intended purpose of external-validity testing: not merely confirming a favorable byte-level result, but discovering when model structure changes the value proposition.

## The memory-saving ideas that failed

The survivors make more sense next to the failures.

We compressed AdamW’s first moment to BF16 and row-scaled INT8. Both preserved short-run quality. Both were too slow in our Python proof implementation to become practical winners.

Then we compressed the second moment. For each eligible matrix, instead of one statistic per parameter, we stored one mean-squared-gradient history per physical row. The memory result was excellent: up to about **85% less optimizer state** than AdamW when combined with INT8 momentum.

Validation loss worsened by about **0.05** across every momentum mode and every seed. A declared learning-rate fallback improved it but left the gap far beyond measured variance. We killed the mechanism.

Our local Adam-mini reference was more structured: per-head statistics for fused query/key blocks, row statistics for several matrices, full moments for biases. It saved about half the state. It still lost to AdamW by +0.0563, with the paired interval entirely on the wrong side of zero.

Memory reduction is not evidence of harmlessness. A smaller statistic can be exactly calculated and consistently wrong for the job.

## The probe that changed after the transform

One failure happened before training.

Row-scaled INT8 momentum looked acceptable on real Muon trajectories when we measured it before Newton–Schulz orthogonalization. The median and tail angles passed our declared gates.

After the same momentum passed through the transform used to create the applied update, the errors failed decisively. Even persistent BF16 momentum missed strict post-transform tail gates.

That broad mechanism is not our discovery. Recent low-bit Muon work explicitly studies directional and singular-subspace error through orthogonalization, and successful 8-bit Muon uses finer blockwise quantization than our physical-row scheme. Our result is narrower and methodological: measuring stored-state reconstruction can approve a state that the actual optimizer transform rejects.

A probe has to measure the update the model receives.

## What we can claim

On one RX 6900 XT, with one ROCm stack and a byte-level TinyStories pretraining screen:

- pinned bitsandbytes AdamW8bit used 74.4% less persistent optimizer state and 10.9% less peak allocated VRAM, at about a 3.2% synchronized-time cost in matched-LR runs; its quality interval established neither improvement nor equivalence;
- NorMuon improved validation loss per token over tuned Muon, with effectively identical memory and slower steps;
- physical-row second moments and our fused-QKV Adam-mini reference saved state and degraded quality;
- pre-transform quantization metrics were insufficient for Muon.

We cannot claim transfer to datacenter accelerators or frontier scale. The completed FineWeb-Edu/GPT-2 BPE screen showed that byte-level rankings did not transfer unchanged: FP32 embedding states erased most of 8-bit AdamW's practical memory benefit, while NorMuon's gain attenuated below the declared effect gate. Pinned preliminary SOAP passed ROCm compatibility, but all four declared batch-4 LR arms became non-finite; that rejects only this small-batch configuration, not SOAP's published large-batch behavior.

The controls that reduced our best headline also gave us a cleaner question. Before matching the learning rate, the 8-bit optimizer looked more accurate. Across three matched pairs afterward, directions were mixed while the memory result remained.

The optimizer did not change when we matched the learning rate. The claim had to become more cautious.
