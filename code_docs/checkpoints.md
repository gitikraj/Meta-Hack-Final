# checkpoints/ — SBERT Evaluation Results

Stores evaluation output from SBERT fine-tuning. The `EmbeddingSimilarityEvaluator` writes results here after each training epoch.

## Folder Structure

```
checkpoints/
└── model/
    └── eval/
        └── similarity_evaluation_cyber-eval_results.csv
```

---

## `model/eval/similarity_evaluation_cyber-eval_results.csv`

CSV file with per-epoch evaluation metrics from SBERT fine-tuning. Written by `sentence_transformers.evaluation.EmbeddingSimilarityEvaluator` during `sbert/train.py` execution.

### Columns

| Column | Description |
|--------|-------------|
| `epoch` | Training epoch number (1-indexed, float) |
| `steps` | Cumulative training steps at end of epoch |
| `cosine_pearson` | Pearson correlation of predicted vs. actual cosine similarity scores |
| `cosine_spearman` | Spearman rank correlation of predicted vs. actual similarity scores |

### Data

```csv
epoch,steps,cosine_pearson,cosine_spearman
1.0,9,0.8865943531468881,0.661711559225909
2.0,18,0.9142619482072705,0.5868101758352701
3.0,27,0.9255651848928766,0.5878022471384574
4.0,36,0.9330940091595915,0.604667459292641
5.0,45,0.9413982187737707,0.6135961010213263
6.0,54,0.9473867936485704,0.6274850992659482
7.0,63,0.9513658351089068,0.6284771705691354
8.0,72,0.9535010453301456,0.5952427819123618
9.0,81,0.9551758363681717,0.5927626036543937
10.0,90,0.9568988458044382,0.5927626036543937
11.0,99,0.958009334733557,0.5927626036543937
12.0,108,0.9585309245173603,0.5892903540932383
13.0,117,0.9587427152494538,0.5922665680028
14.0,126,0.9587574473025023,0.5922665680028
15.0,135,0.9587574473025023,0.5922665680028
```

### Key Observations

- **Cosine Pearson** improves steadily from 0.887 (epoch 1) to 0.959 (epoch 15), plateauing around epoch 13
- **Cosine Spearman** peaks at 0.628 (epoch 7), then slightly decreases — suggests possible overfitting on rank correlations after epoch 7
- **Best epoch by Spearman**: Epoch 7 (0.6285)
- **Best epoch by Pearson**: Epoch 15 (0.9588)
- Training ran for 15 epochs × 9 steps/epoch = 135 total steps (batch_size=16, ~150 training pairs)
