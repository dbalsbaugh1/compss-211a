# Week 9: which documents are similar to each other?

This week answers one question: given a set of documents, which ones use similar language? We measure that with the TF-IDF table from Week 8 and a score called cosine similarity, then read the matches to decide whether they make sense. Sorting documents into groups with KMeans is an optional last step.

This is a complete method for a final project. You do not need anything beyond this page and Week 8.

## One row per document

In Week 8, `TfidfVectorizer` turned a column of text into a table with one row per document and one column per term. Each row is a list of numbers that describes one document. That list is called a document vector. Some readings call it a document embedding.

With the OpenAlex sample used in class:

- 80 abstracts, so 80 rows;
- about 1,240 terms that appear in at least two abstracts, so about 1,240 columns.

Before you compare anything, decide what one document is in your project: a comment, a post, an abstract, a speech, a chapter. The scores can only compare the units you chose.

## Clean what the vectorizer should not see

Some OpenAlex abstracts contain leftover web markup, such as `<mml:math xmlns:mml="http://www.w3.org/...">` for equations and `&amp;` for an ampersand. `TfidfVectorizer` treats `xlink`, `w3`, and `mrow` as ordinary words. In the raw data, the two most similar abstracts are a paper on dialogue systems and a paper on a radio-frequency circuit. They match because both contain equation markup, not because of their subject.

The class code removes tags and converts entities before building the table:

```python
import html
works["text"] = works["abstract"].str.replace(r"<[^>]+>", " ", regex=True).map(html.unescape)
```

Your own data may have a different problem: signatures, quoted replies, boilerplate headers, or URLs. Look at the words that drive your top matches. That is usually how these problems show up.

## Cosine similarity

`cosine_similarity` compares two document vectors and returns a score.

| Score | What it means here |
|---|---|
| 0 | The two documents share no terms in the table. |
| Closer to 1 | The documents give weight to more of the same terms. |
| 1 | The two rows have the same proportions of term weights (a document compared with itself). |

TF-IDF weights are never negative, so scores stay between 0 and 1.

`cosine_similarity(tfidf_matrix)` scores every pair of documents at once and returns a square table. For 80 abstracts, it is `(80, 80)`. Row `i` holds the scores between document `i` and every other document.

Scores in this sample are mostly small, with a median around 0.02. The abstracts come from many fields, so most pairs share few terms. Compare scores within one corpus and one set of vectorizer settings. A score of 0.3 does not mean the same thing in another dataset.

## Find and read the nearest documents

To find the documents closest to one anchor document:

1. Take the anchor's row of scores.
2. Sort it from high to low.
3. Skip the first entry, which is the anchor itself.
4. Keep the next few.

Then read the anchor and its closest matches. A useful check is to list the terms that the two documents share, weighted by how much each term adds to the score. Because `TfidfVectorizer` scales each row to length 1, these products add up to the cosine score:

```python
shared = pd.Series(anchor_row * neighbor_row, index=terms)
shared[shared > 0].sort_values(ascending=False).head(10)
```

In the cleaned OpenAlex data, some matches hold up on reading. Two cosmology papers share `lensing`, `cosmic`, and `structure`. Others do not hold up. A study of menopause timing and a meta-analysis of air pollution match on `age`, `associations`, and `years`. Two medical studies match on `ci`, `95`, and `median`, which are words about how results were reported, not about what was studied.

A high score shows that two documents share weighted terms. It does not show that they make the same argument, agree with each other, or belong to the same topic. Decide that by reading.

## Optional: sort the documents into groups

KMeans assigns each document to one of `k` groups so that documents in a group have similar vectors. You choose `k` with `n_clusters`.

```python
from sklearn.cluster import KMeans
model = KMeans(n_clusters=5, random_state=211)
works["cluster"] = model.fit_predict(tfidf_matrix)
```

`random_state` fixes the random starting point so you get the same groups each time you run the notebook. A fixed seed makes the result repeatable. It does not make the groups correct.

The cluster numbers are labels, not rankings. Group 0 is not first or best.

Before you describe a group:

1. Check how many documents it has.
2. Print the terms with the highest average weight in the group.
3. Read several titles and abstracts, including ones that do not fit the description you have in mind.
4. Rerun with another value of `n_clusters` and see whether the group stays together.

Describe a group as "a group the model formed around these terms," not as a category that exists in the data. It is fine to say a group is too mixed to describe.

## Using this in your final project

A small, complete project could be: pick one question, build a TF-IDF table for one dataset, find the nearest documents for a handful of anchors you chose for a reason, and report what you found when you read them.

In your write-up, report:

- what one document is and how many you have;
- the cleaning you did and the `TfidfVectorizer` settings (`stop_words`, `min_df`, `max_features`, `ngram_range`);
- how you chose the anchor documents;
- for each anchor, its closest matches, their scores, and the shared terms;
- which matches held up on reading and which did not, with a reason for each;
- if you used KMeans: the value of `n_clusters`, the group sizes, the top terms, and what changed with a different value.

## Going further

TF-IDF compares documents by the exact terms they share, so "car" and "automobile" count as different words. Other methods address this:

- **LSA** (`TruncatedSVD` in scikit-learn) compresses the TF-IDF table into a smaller number of columns built from terms that tend to appear together.
- **Pretrained embedding models** (for example, the `sentence-transformers` library or an embedding API) produce a vector for each document from a model trained on much more text.

Both replace the TF-IDF table in the workflow above. The steps after that are the same: compute cosine similarity, find the nearest documents, and read them. None of these methods decides what counts as a document or whether a match makes sense. That part is still up to you.

## About the course data

The OpenAlex file contains 80 works with abstracts and at least one UC Berkeley-affiliated authorship. That filter does not mean every work was led by Berkeley or written by Berkeley faculty. The sample is useful for practicing the workflow, not for making claims about Berkeley research.

## Documentation

- [Scikit-learn text feature extraction](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction)
- [Cosine similarity](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html)
- [KMeans](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.KMeans.html)
- [TruncatedSVD](https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.TruncatedSVD.html) (optional, for LSA)
