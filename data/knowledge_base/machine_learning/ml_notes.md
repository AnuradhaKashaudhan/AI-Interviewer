# Machine Learning Knowledge Base

## Topic: Overfitting and Regularization
- **Domain**: machine_learning
- **Topic**: overfitting
- **Difficulty**: medium

### Concepts
Overfitting occurs when a machine learning model learns the noise, detail, and specific fluctuations in the training dataset rather than the underlying general signal. As a result, the model exhibits exceptionally high performance on training data but fails to generalize to unseen test or validation data.

### Prevention Techniques
1. **L1 Regularization (Lasso)**: Adds an absolute value penalty term $\lambda \sum |\beta_j|$ to the loss function. This forces some feature coefficients to shrink exactly to zero, achieving sparse feature selection.
2. **L2 Regularization (Ridge)**: Adds a squared magnitude penalty term $\lambda \sum \beta_j^2$ to the loss function. It prevents individual weights from becoming excessively large while retaining all features.
3. **Cross-Validation**: K-Fold cross-validation splits training data into K subsets to tune hyperparameters without leaking evaluation statistics.
4. **Early Stopping**: Halts training in iterative algorithms when validation loss begins to diverge from training loss.
5. **Dropout**: Randomly deactivates a fraction of neural network units during each forward pass during training.

---

## Topic: Classification Metrics & Evaluation
- **Domain**: machine_learning
- **Topic**: classification_metrics
- **Difficulty**: hard

### Precision vs. Recall Tradeoff
- **Precision**: $\frac{TP}{TP + FP}$ measures the exactness of positive class predictions. Critical in applications like spam filtering or fraud detection where false positives are costly.
- **Recall**: $\frac{TP}{TP + FN}$ measures the completeness of positive class identification. Critical in medical diagnosis where false negatives must be minimized.
- **ROC-AUC vs PR-AUC**: Receiver Operating Characteristic AUC measures true positive rate against false positive rate. Precision-Recall AUC is superior for severely imbalanced datasets because it does not include true negatives in the denominator.
