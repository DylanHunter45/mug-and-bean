# Benchmark label images

Drop coffee-bag label photos here, one image per bag. These are
the **known-answer dataset** for the OCR benchmark and double as the
OCR regression corpus later.

## Rules

- **Filenames must match the `file` field** of an entry in
  `../ground-truth.json`. The runner pairs them by name (the current dataset uses
  the camera's `YYYYMMDD_HHMMSS.jpg` names — that's fine, just keep them in sync).
- JPG or PNG, the label reasonably in focus and filling most of the frame.
- **≥30 images** are required for a valid benchmark. Aim for a spread that
  includes artisan / hand-lettered typography —
  that's the hard case the vendors are being compared on.

## Ground-truth values are in the label's language

This dataset is **French**, so record ground-truth values **as printed** —
`Lavé`, not `Washed`; `Colombie`, not `Colombia`. The benchmark measures OCR +
parse quality, and the OCR reads what's on the bag; translating in the ground
truth would penalise correct OCR and conflate it with a separate translation
step. Canonical-English translation happens downstream, not here. Copy the `_template` object in
`../ground-truth.json` for each new label; only `roaster`/`origin`/`process`/
`tastingNotes` are scored — the rest is recorded for later reuse.

## Git

The image binaries are **git-ignored** (see `../.gitignore`) to keep the repo
small; only this README and `ground-truth.json` are committed. The images live
in local / shared storage and are reproducible from the physical collection. If
you later decide the corpus should be version-controlled for CI regression,
revisit that ignore rule.
