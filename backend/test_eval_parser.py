import re, json

raw = """
We need to evaluate the generated answer against the metrics.

- faithfulness: 0.94 (some minor hallucination about source index)
- answer_relevancy: 0.96 (directly answers)
- context_precision: 0.78 (some noise)
- context_recall: 1.00

Reasoning: "The answer correctly confirms the existence of a packing list."

Now produce JSON:

{
  "faithfulness":
"""

def fallback_parse_text(text):
    f_match = re.search(r"faithfulness[\"\':\s]+([0-1]\.\d+|\d+)", text, re.IGNORECASE)
    ar_match = re.search(r"answer_relevancy[\"\':\s]+([0-1]\.\d+|\d+)", text, re.IGNORECASE)
    cp_match = re.search(r"context_precision[\"\':\s]+([0-1]\.\d+|\d+)", text, re.IGNORECASE)
    cr_match = re.search(r"context_recall[\"\':\s]+([0-1]\.\d+|\d+)", text, re.IGNORECASE)
    r_match = re.search(r"reasoning[\"\':\s]+[\"\']?([^\"\n\r\}]+)", text, re.IGNORECASE)

    if f_match or ar_match or cp_match or cr_match:
        return {
            "faithfulness": float(f_match.group(1)) if f_match else 0.85,
            "answer_relevancy": float(ar_match.group(1)) if ar_match else 0.85,
            "context_precision": float(cp_match.group(1)) if cp_match else 0.85,
            "context_recall": float(cr_match.group(1)) if cr_match else 0.85,
            "reasoning": r_match.group(1).strip() if r_match else "Extracted from LLM text evaluation output.",
        }
    return None

print("PARSED FROM TEXT:", fallback_parse_text(raw))
