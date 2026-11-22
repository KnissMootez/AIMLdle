# Term candidates

Source: StatQuest "Machine Learning" playlist
(https://youtube.com/playlist?list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF), all 107 videos.
Videos 101–107 are PyTorch walkthroughs plus RL, RL with neural networks and RLHF (added in batch 2).

**Batch 2 (2026-11-22):** 63 more terms, bringing the total to 128. They're the playlist's RL topics plus well-known terms
from outside the playlist (Dropout, Adam, GAN, VAE, Diffusion, ResNet, ViT, CLIP, LoRA, RLHF, F1, KL
divergence, SHAP...). See `terms.json` for the full list.

Left out: R/Python walkthroughs, the sing-along, "Bam!!!" and "Troll 2".
This list only holds names. Facts (year, origin, ...) go in `terms.json`, each with a `source`.

Status: `[ ]` candidate, `[x]` in terms.json, `[-]` cut (with reason)

**2026-11-22:** 65 of these terms are in `data/terms.json`. Everything not marked `[-]` below is in.
Merged or cut: Specificity (identical attributes to Sensitivity), Polynomial and RBF Kernel (merged into
"Kernel Trick"), One-hot and Label Encoding (no citable origin year), Lightning (an alias of PyTorch),
ArgMax, Gaussian Naive Bayes (an alias of Naive Bayes), Design Matrix.

## Evaluation
- [ ] Cross Validation
- [ ] Confusion Matrix
- [ ] Sensitivity (Recall)
- [ ] Specificity
- [ ] Precision
- [ ] ROC Curve
- [ ] AUC
- [ ] Bias–Variance Tradeoff
- [ ] R-squared
- [ ] p-value
- [ ] Deviance

## Math / information theory
- [ ] Entropy
- [ ] Mutual Information
- [ ] Cosine Similarity
- [ ] Chain Rule
- [ ] Odds and Log-odds
- [ ] Odds Ratio
- [ ] Maximum Likelihood
- [ ] Tensor

## Regression and linear models
- [ ] Least Squares
- [ ] Linear Regression
- [ ] Multiple Regression
- [ ] t-test
- [ ] ANOVA
- [-] Design Matrix (cut: too niche to guess)
- [ ] Logistic Regression
- [ ] Ridge Regression (L2)
- [ ] Lasso Regression (L1)
- [ ] Elastic Net

## Dimensionality reduction
- [ ] PCA
- [ ] LDA (Linear Discriminant Analysis)
- [ ] MDS / PCoA
- [ ] t-SNE

## Clustering
- [ ] Hierarchical Clustering
- [ ] K-means
- [ ] DBSCAN

## Classic models
- [ ] K-Nearest Neighbors
- [ ] Naive Bayes
- [-] Gaussian Naive Bayes (cut: a variant of Naive Bayes)
- [ ] Decision Tree
- [ ] Regression Tree
- [ ] Tree Pruning
- [ ] Random Forest
- [ ] Support Vector Machine
- [ ] Polynomial Kernel
- [ ] RBF Kernel

## Feature encoding
- [ ] One-hot Encoding
- [ ] Label Encoding
- [ ] Target Encoding

## Optimization
- [ ] Gradient Descent
- [ ] Stochastic Gradient Descent
- [ ] Backpropagation

## Boosting
- [ ] AdaBoost
- [ ] Gradient Boosting
- [ ] XGBoost
- [ ] CatBoost

## Neural networks
- [ ] Neural Network
- [ ] ReLU
- [ ] Softmax
- [-] ArgMax (cut: too close to Softmax)
- [ ] Cross Entropy
- [ ] CNN
- [ ] RNN
- [ ] LSTM
- [ ] Word2Vec
- [ ] Seq2seq (Encoder–Decoder)
- [ ] Attention
- [ ] Transformer
- [ ] Decoder-only Transformer
- [ ] BERT (Encoder-only Transformer)
- [ ] RAG

## Tools
- [ ] PyTorch
- [ ] Lightning
