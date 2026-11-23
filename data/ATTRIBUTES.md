# Attributes: definitions and rules

> The rules here decide every value in `terms.json`. If a term doesn't fit cleanly, fix the rule
> here first, then tag the term. Past decisions are logged at the bottom.

The term set (mostly from StatQuest, see `candidates.md`) is mainly classical ML and statistics,
with deep learning and transformers at the end. The attributes below are tuned for that mix.

## Overview

| # | Attribute | Key | Type | Feedback |
|---|---|---|---|---|
| 1 | Category | `category` | single | green / red |
| 2 | Task | `task` | multi | green / orange / red |
| 3 | Learning type | `learningType` | multi | green / orange / red |
| 4 | Year | `year` | number | green / ↑ / ↓ |
| 5 | Field of origin | `field` | single | green / red |
| 6 | Family | `family` | single | green / red |
| 7 | Difficulty | `difficulty` | ordinal | green / ↑ / ↓ |

**Multi-value feedback:** green = exactly the same set, orange = at least one shared value,
red = nothing shared.
**Number and ordinal feedback:** green = equal; ↑ = the answer is higher/later; ↓ = the answer is
lower/earlier. **Year only:** within ±5 years (`YEAR_CLOSE_WITHIN` in `src/compare.ts`) the tile is
orange and keeps its arrow.

---

## 1. Category (single)

What kind of thing the term *is*. Ask the questions below in order; the first "yes" wins.

| Value | Test | Examples |
|---|---|---|
| Tool | Is it software you install? | PyTorch, Lightning |
| Metric | Is it a number you compute to judge a model or result? | AUC, R-squared, Precision |
| Statistical test | Is it a hypothesis test, or its output? | t-test, ANOVA, p-value |
| Model | Can you train it on data and then use it to predict, cluster or embed? | Linear Regression, Random Forest, K-means, PCA, Transformer |
| Component | Is it a building block *inside* a model (activation, loss, kernel, layer)? | ReLU, Softmax, Cross Entropy, RBF Kernel, Attention |
| Optimization | Is it a way to fit a model's parameters? | Gradient Descent, SGD, Backpropagation, Maximum Likelihood |
| Technique | Is it a procedure applied *around* a model (validation, regularization, encoding, pruning)? | Cross Validation, Lasso penalty, One-hot Encoding, Tree Pruning |
| Dataset | Is it a named collection of data? | MNIST, ImageNet, Iris |
| Concept | None of the above: an idea or piece of math. | Entropy, Bias–Variance Tradeoff, Chain Rule, Tensor, Odds |

*Changes from the first draft:* "Architecture" is merged into Model (CNN, Transformer), because
the two would be hard to tell apart. "Optimizer" is renamed Optimization. "Loss" is merged into
Component. "Statistical test" and "Component" are new.

**Ridge / Lasso / Elastic Net → Model.** The terms are named as regression models
("Ridge Regression"), and that's how the videos teach them. The penalty itself (L1/L2) is
the Technique, if it's ever added as its own term.

## 2. Task (multi)

What problem the term is mainly used for.

Values: `Classification`, `Regression`, `Clustering`, `Dimensionality reduction`,
`Sequence modeling`, `Generation`, `Control`, `Evaluation`, `General`

- `Generation` = creates new content (images, text) rather than labelling or predicting a value:
  GAN, VAE, Diffusion, GPT. Translation (Seq2seq) stays `Sequence modeling`.
- `Control` = choosing actions to maximize reward (reinforcement learning): Q-learning, MDP, bandits.
- `Recommendation` = suggesting items to users: Collaborative Filtering, Matrix Factorization.
- Datasets: the task they're mainly used to benchmark.

- List every task the term is **commonly** used for: the uses a textbook or the standard libraries
  cover (SVM → Classification + Regression via SVR), not every exotic possibility.
- `General` = used across most tasks (Gradient Descent, Chain Rule). **`General` is used alone.**
- Metrics: the task they measure **plus `Evaluation`** (AUC → Classification + Evaluation;
  R-squared → Regression + Evaluation). Correlations (Pearson, Spearman) are measures of association,
  not model evaluation, so they don't get `Evaluation`.
- Statistical tests (t-test, ANOVA, p-value) → `Evaluation`.

*Why replace Domain:* with these terms, 80%+ would be "General" or "Tabular", so the
Domain column would almost never help the player. Task splits the classical terms well.
Domain can come back when the list has more NLP/vision terms.

## 3. Learning type (multi)

Values: `Supervised`, `Unsupervised`, `Self-supervised`, `Reinforcement`, `N/A`

- Every learning setting the term is **commonly trained in**, not whether it could technically be
  adapted. Pre-train + fine-tune models list both (BERT, GPT, T5 → Self-supervised + Supervised).
- Self-supervised = labels made from the data itself (Word2Vec, BERT pre-training, GPT-style).
- **Only Models and Techniques have a learning type.** Every other category (Metric,
  Statistical test, Concept, Component, Optimization, Tool) is `N/A`. The validator enforces this.
  **`N/A` is used alone.**
- Optimization methods used in every setting (Gradient Descent, SGD, Backpropagation) →
  **`N/A`**. They're ways to fit parameters, not learning settings, and listing every setting
  would make them orange against almost every guess.

## 4. Year (number)

- **The year of the publication that defines the term as we use it in ML**, not the first
  vague idea. Examples: the paper that named or formalized it, or the book/paper usually cited
  for it.
- Old math and statistics are allowed (least squares is from the early 1800s). The arrows still work.
- If historians disagree, pick the commonly cited source, put it in `source`, and set
  `"verify": true` until it's been checked.
- Tools: the year of the first public release.

## 5. Field of origin (single)

**The academic discipline** the defining work came from, judged by its author(s) and venue.
Only disciplines: *where* it was done (university or company) is not part of this attribute.

Values: `Statistics`, `Mathematics`, `Information theory`, `Physics`, `Computer science`

- `Physics` = the defining work came from physics (Hopfield networks, simulated annealing, Metropolis MCMC).
- Company research is classified by its discipline: Shannon at Bell Labs → Information theory,
  Gosset at Guinness → Statistics, Google's Transformer / Meta's PyTorch / Yandex's CatBoost → Computer science.
- If it's unclear (for example statistics vs computer science for SVMs), pick one, explain
  why in `source`, and set `"verify": true`.

*History:* an `Industry lab` value existed until 2026-11-23. It was removed because it mixed a
*kind of origin* with *disciplines*, so players couldn't predict which one a term would get.

## 6. Family (single)

**The kind of method (its lineage), not the time period.** A 2021 diffusion model is still Deep learning.

| Value | Meaning | Examples |
|---|---|---|
| Foundations | Math/statistics used throughout ML, not an ML method itself | Entropy, Chain Rule, Odds, p-value, Tensor |
| Classical ML | Non-neural methods and their tooling | Logistic Regression, Random Forest, SVM, PCA, XGBoost |
| Deep learning | Neural networks that aren't transformer-based | Neural Network, CNN, LSTM, Word2Vec, ReLU, GAN, Stable Diffusion |
| Transformer era | Transformer models and the techniques built around them (prompting, alignment, fine-tuning, retrieval) | Attention, Transformer, BERT, ViT, CLIP, RAG, LoRA |

*Changes from the first draft:* "Probabilistic" is replaced by "Foundations". Probabilistic would
overlap with Classical ML (Naive Bayes is both), and the StatQuest terms need a home for pure
math and statistics.

**Evaluation metrics** (AUC, Precision, R-squared, Deviance…) and **Cross Validation** → Classical ML:
they come from classical model evaluation. Pure math/stat ideas and hypothesis tests → Foundations.

**Edge cases:** Attention (2014, before transformers) → **Transformer era**, because it's the core of
transformers. Stable Diffusion (2021) → **Deep learning**: latent diffusion with a U-Net, not a
transformer model, even though it uses a text encoder. **Gradient Descent / SGD → Foundations**, because they're general calculus-based
optimization that's also used in classical ML. **Backpropagation → Deep learning**, because it
exists to train neural networks.

## 7. Difficulty (ordinal)

`Beginner` < `Intermediate` < `Advanced`

| Level | Rule of thumb |
|---|---|
| Beginner | High-school math is enough; it's in the first weeks of an intro ML course. (Confusion Matrix, K-means, Linear Regression) |
| Intermediate | Needs calculus or linear algebra, or builds on 2+ other terms. (Logistic Regression, PCA, Gradient Boosting, LSTM) |
| Advanced | Needs several intermediate terms together, or research-level detail. (XGBoost internals, Transformer, t-SNE) |

Subjective by nature. When unsure, pick the lower level.

---

## Answer pool: `daily` (boolean)

Not an attribute shown in the game. It decides which terms can be the daily or practice **answer**.
Every term can still be **guessed**.

- `true` = a learner who has done an intro ML course or watched StatQuest would probably know it.
- `false` = niche, advanced or very specialised (CatBoost, Xavier init, BLEU, ICA...). These are still useful
  as guesses to narrow things down.
- The validator requires at least 60 `daily` terms.

## Decision log
- **2026-11-22:** Domain → **Task**, Origin → **Field of origin** (to suit a mostly classical term set).
- **2026-11-22:** Ridge/Lasso/Elastic Net = Model.
- **2026-11-22:** General optimizers have Learning type `N/A`.
- **2026-11-22:** Gradient Descent/SGD = Foundations; Backpropagation = Deep learning.
- **2026-11-22:** Cut Gaussian Naive Bayes (a variant of Naive Bayes), ArgMax (too close to
  Softmax) and Design Matrix (too niche to guess).
- **2026-11-22:** Merged Polynomial and RBF kernels into one term, **Kernel Trick** (as two terms they had
  identical attributes). Cut Specificity (identical attributes to Sensitivity; mentioned in its
  explanation). Cut One-hot and Label Encoding (no citable origin year). Folded Lightning into PyTorch
  (as an alias).
- **2026-11-22:** Only Models and Techniques have a learning type; everything else is `N/A`.
- **2026-11-22:** The validator rejects two terms with identical attributes, because players couldn't tell them apart.
- **2026-11-22:** Added Task values `Generation` and `Control` for the second batch of terms
  (generative models, reinforcement learning). GPT gains `Generation`.
- **2026-11-22:** Batch 3 brings the total to 228 terms. Added the `daily` flag (split answer pool). New values: Category
  `Dataset` (MNIST, ImageNet, Iris, COCO), Task `Recommendation`, Field `Physics` (Hopfield,
  simulated annealing, MCMC).
- **2026-11-23 (external review):** Field is disciplines only (`Industry lab` removed, 45 terms → their
  discipline, all Computer science). Family `LLM era` renamed `Transformer era` and defined as the kind
  of method, not the period (ViT fits; Stable Diffusion moved to Deep learning). Diffusion models
  gain `Self-supervised` (denoising objective), which also keeps them distinct from Normalizing Flows.
  The Year rule is now shown in How to play. The big faded arrow behind year/difficulty values was
  removed for readability (the corner arrow is bigger instead).
- **2026-11-23:** Orange showed up in only ~5% of guesses. Two changes: (1) years within ±5 are orange
  "close" tiles; (2) Task / Learning now list every *common* use, not only the main one (50 terms retagged:
  metrics gain `Evaluation`, SVR/AdaBoost/GLM/GP gain a second task, sequence models gain `Generation`,
  pre-train + fine-tune models gain `Supervised`, RLHF gains `Control`). Orange now appears in ~22% of rows.
- **2026-11-22:** `emoji`, `definitionHint` and `paper` are left out of the v1 schema (they're only needed
  for the later game modes). Add them when those modes are built.
