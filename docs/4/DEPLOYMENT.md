# AWS static deployment

## Result
Drew TV is published at **https://doctorew.com/tv/**. The shorter https://doctorew.com/tv also resolves through the existing directory-index function.

The release contains 15 static objects, approximately 2.1 MB: HTML, CSS, browser modules, the curated catalog metadata, a hosted source guide and the upstream MIT license. Media remains at Archive, YouTube or Tubi.

## Target

| Setting | Value |
| --- | --- |
| AWS account | `432230020714` |
| Region | `us-east-1` |
| Bucket | `doctorew.com` |
| Object prefix | `tv/` |
| CloudFront distribution | `E249RTOPQ86NDO` |
| CloudFront hostname | `d1nfiiv13ptkbn.cloudfront.net` |
| Existing viewer-request function | `index-rewrite` |

The existing public-read bucket policy and existing HTTPS distribution serve this path. No DNS, certificate, bucket-policy or CloudFront configuration changes were required. The original homepage object retained ETag `8e2269b845b2cb66aa20ba586e3575a0` and version `Lyo5_H_LX39OS1C8tI5PHXzRSkdam.kK` after deployment.

## Build and update
From the repository root:

```sh
cd yata
npm test
npm run check
npm run deploy:aws
```

The deployment script reads `deploy/aws-static.json`, verifies the AWS account and distribution hostname, builds into a new temporary directory, uploads only the release manifest's files beneath `tv/`, uploads HTML last and invalidates `/tv` plus `/tv/*`. It does not delete other objects or modify the distribution. The command prints a deployment receipt containing uploaded object versions and its invalidation ID. AWS credentials are supplied by the existing AWS CLI configuration and are not stored in the repository.

For a package without publication:

```sh
node scripts/build-static.mjs --out /tmp/drew-tv-new-release --base /tv/
```

Use an empty output directory. `release-manifest.json` records each file's MIME type, size and SHA-256. JavaScript modules use `text/javascript`; JSON uses `application/json`. HTML uses `no-cache, max-age=0`; other objects use `public, max-age=300`.

The builder adds the `/tv/` base URL and a static-hosting capability marker. This supports both slash and non-slash entry URLs without changing the existing edge function. The license is published as `LICENSE.txt` because the existing edge function treats extensionless names as directories.

## Hosted behavior
The complete curated catalog loads in the browser. Archive discovery, direct source editing, official YouTube video/playlist playback, Tubi links, catalog export/import and the channel guide remain available. Arbitrary YouTube playlist expansion depends on the local metadata tool; the hosted interface explains this limitation instead of calling a nonexistent API. No Node server or media proxy runs in AWS.

Catalog settings and personal edits remain in each browser's local storage. The deployed origin has separate storage from localhost; export/import transfers custom edits. There is no server-side account or cross-device synchronization.

## Verification
- 27 automated tests passed, including static packaging, subpath handling, module MIME declarations and development-file exclusion.
- Every one of the 15 live release files returned the expected SHA-256 digest and MIME type over HTTPS.
- `/tv`, `/tv/`, modules and the catalog returned HTTP 200. The root homepage retained its previous object identity.
- Chrome loaded the hosted application at the non-slash URL, installed the 1,889-item baseline catalog and reached actual `PLAYING · ARCHIVE` state for the A-Team pilot.
- Initial invalidation `IBP922F3YIAVPUZYT5JDWNOKLS` completed. A follow-up invalidation `I96X2WEAH11OYEDWYIX4VSGELE` refreshed the hosted source guide and license path.

## Rollback
To restore a previous application release, check out its source revision, run its build checks and deploy that release to the same prefix. Keep the printed object-version receipt when an object-specific restoration is required. S3 versioning was active during this deployment.

To take only the TV landing page offline, remove its current versioned index and clear the affected entry paths:

```sh
aws s3api delete-object --bucket doctorew.com --key tv/index.html
aws cloudfront create-invalidation --distribution-id E249RTOPQ86NDO --paths /tv /tv/ /tv/index.html
```

This creates a recoverable delete marker for the index. Other TV assets remain until explicitly removed; the root homepage and other paths are outside this rollback scope.
