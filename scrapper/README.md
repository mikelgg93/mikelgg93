# Scholar citation updates

## Weekly updates with SerpApi

Create a SerpApi account and add its API key as the repository Actions secret
`SERPAPI_API_KEY` (Settings → Secrets and variables → Actions).

Replace `.github/workflows/update_img_scholar.yml` with:

```yaml
name: Update Scholar citations
on:
  schedule:
    - cron: "0 8 * * 1"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: scholar-citation-data
  cancel-in-progress: false

jobs:
  update:
    if: github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: master
      - uses: actions/setup-python@v5
        with:
          python-version-file: scrapper/.python-version
      - uses: astral-sh/setup-uv@v6
        with:
          version: "0.9.2"
      - name: Fetch citation graph
        working-directory: scrapper
        env:
          SERPAPI_API_KEY: ${{ secrets.SERPAPI_API_KEY }}
          MPLBACKEND: Agg
        run: |
          uv sync --locked
          uv run python -m scholar.serpapi --out ../portfolio/public
      - name: Commit citation data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add portfolio/public/citations.json portfolio/public/barplot.png
          if ! git diff --cached --quiet; then
            git commit -m "Update Scholar citations"
            git push origin HEAD:master
          fi
```

Merge the Python changes before running this workflow. It runs Mondays at 08:00
UTC and can also be run manually from Actions. No browser installation is needed.
One request retrieves the yearly graph through SerpApi's
[Google Scholar Author API](https://serpapi.com/google-scholar-author-api).
This updates yearly counts and the chart; it preserves the existing publication
list and older years absent from the response. Missing credentials, quota errors,
and invalid or incomplete graphs fail the job without replacing stored data.

## Local browser snapshot fallback

Open [the Scholar profile](https://scholar.google.com/citations?user=P1qW5Z0AAAAJ&hl=en),
complete any verification, check that the graph includes the current year, and
save the page as HTML. From `scrapper`, run:

```sh
uv sync --locked
uv run python -m scholar.snapshot --file /path/to/profile.html --out ../portfolio/public
```

Review and commit the generated JSON and chart. The importer validates the author
and graph, preserves publications, and does not execute or commit the saved HTML.
