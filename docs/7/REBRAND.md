# YATA rebrand

## Objective
Rename the companion app to **YATA — Yet Another TV App**. Issue: [#7](https://github.com/doctor-ew/floating-browser/issues/7).

## Changes
Updated the page title, accessible home label, header wordmark and expansion, standby wordmark, default channel label/name, footer, exported catalog filename, package name, current source guides and local server launch message. The static hosted guide points to this release branch.

## Compatibility
The existing browser catalog and library-revision storage keys are retained so saved sources, stream preferences and settings carry over without migration. Hosting remains https://doctorew.com/tv/. Catalog inventory, player behavior and upstream MIT attribution are preserved. Historical issue documentation and operational identifiers retain their original names where they identify existing resources.

## Validation
All 40 existing automated tests, syntax checks and whitespace checks passed. Current product text was searched for the former visible brand. This is a text/wordmark change using the existing styles; no new behavior tests were introduced.
