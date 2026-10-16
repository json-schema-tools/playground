# Releasing

GitHub Actions installs the locked dependencies, runs lint and Jest, and builds
the playground on Node 20 and 22. This legacy webpack build needs
`NODE_OPTIONS=--openssl-legacy-provider`; `.npmrc` preserves its existing peer
dependency compatibility. Neither setting grants deployment credentials.

The repository currently has no tests. Jest retains `--passWithNoTests` and
initial zero coverage thresholds rather than inventing a coverage baseline.
After adding tests, run `npm test`, then `npm run coverage:bump` to raise the
thresholds with jest-it-up. CI enforces the committed thresholds without Codecov.

After successful master CI, release-please opens a release PR for `fix:` and
`feat:` commits. Merge it to create a bare version tag and deploy its tested
production build to GitHub Pages. Release PRs receive explicitly dispatched CI.
This application is not published to npm. The baseline is release 1.1.5.

Configure a `release` environment restricted to master, enable GitHub Actions
PR creation, switch the existing Pages site to Actions deployment, and replace
CircleCI required checks with the Actions test matrix while preserving other
branch protections. Keep the existing custom domain. The built-in GitHub token
provides deployment access; no manually managed token or secret is required.
Disable the legacy CircleCI project after merging.

## Shared workflows

CI and release execution is maintained in [foundation](https://github.com/json-schema-tools/foundation). Entry points pin a reviewed foundation commit; update both workflow pins together to adopt changes. Package scripts, coverage baselines and release-please metadata stay here. Trusted publishing continues to use this repository’s `release.yml` and `release` environment.
