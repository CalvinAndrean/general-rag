## 2024-07-30 - Contextual ARIA labels in tables
**Learning:** Icon-only buttons within table rows (like Preview, Download, Delete) lack context for screen reader users when read out of order. Adding the document/item name directly into the ARIA label (e.g. `aria-label="Delete document filename.pdf"`) makes the action completely unambiguous for assistive technology.
**Action:** Always include the item name or identifying context in ARIA labels for action buttons inside lists or tables.
