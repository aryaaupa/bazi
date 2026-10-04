# Publication and the Bazi domain

## Launch independently of a domain purchase

The project builds a static website in `dist/`. Public entry points are `/` and `/app/`; all old app/demo/marketing URLs redirect to the connected experience. Every website URL is relative, so the exact same build works at an apex domain or a GitHub Pages repository prefix.

The repository's GitHub Actions workflow checks the implementation, runs the SDK and workflow tests, builds the deployment allowlist, and deploys `dist/` to GitHub Pages on a push to `main`.

Expected default GitHub Pages address: `https://aryaaupa.github.io/bazi/`. Confirm the actual URL returned by the **Deploy Bazi to GitHub Pages** workflow. If Pages is not already enabled, set repository **Settings → Pages → Source → GitHub Actions**.

## bazi.com

Checked October 4, 2026: `bazi.com` is already registered. The retrieved RDAP record lists registration in 1998, registrar Network Solutions, and expiration August 17, 2027. It cannot be obtained as an ordinary unregistered-domain purchase. An acquisition requires agreement with its owner; availability and price are not established.

Do not make the demo depend on that acquisition. Launch at the working host address. If the exact name is essential, make an owner/broker inquiry separately and use a trusted transfer process. No inquiry, offer, or purchase has been made by this implementation.

Source: https://www.who.is/rdap/bazi.com

Alternative names such as `usebazi.com` or `bazihealth.com` may suit the brand, but their current availability and prices have not been verified. Check at a registrar before choosing one.

## Connect an acquired domain to GitHub Pages

1. Own or control the domain and verify it with GitHub as described in the official documentation.
2. In repository **Settings → Pages → Custom domain**, enter the intended canonical domain. With a custom Actions deployment, set the custom domain there; a source `CNAME` file is not required by GitHub's custom workflow routing.
3. At the DNS provider, configure the apex records or `www` CNAME using GitHub's current published values. Preserve unrelated email records. Do not guess IP addresses or mix old hosting records with the new apex records.
4. Wait for DNS verification and certificate issuance, then enable **Enforce HTTPS** in Pages.
5. Confirm that both the apex and `www` resolve to the chosen canonical host and that `/app/`, a patient deep link, and legacy `/demo.html` work.

Current documentation: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Alternative: Cloudflare Pages

Connect `aryaaupa/bazi` to a Cloudflare Pages project. Use production branch `main`, build command `npm run build`, and output directory `dist`. No application environment variables are needed for the synthetic website. Node 24 is used by the GitHub workflow; use a supported modern Node version in Cloudflare as well.

Add the domain under the project's **Custom domains** before editing DNS. Cloudflare requires an apex domain to be a zone in the same account with Cloudflare nameservers. A subdomain can use a CNAME from an external DNS provider. Use the exact target returned by Cloudflare; simply pointing DNS at a Pages address without attaching the hostname can fail.

Documentation: https://developers.cloudflare.com/pages/configuration/custom-domains/

## A separate real-data environment

This public build excludes Supabase configuration, SQL, partner data, and runtime secrets. The existing authenticated backend scaffold remains in source control, separate from the public demo. Connecting real participants, authenticated providers, or production integrations needs its own reviewed environment and validation pathway.
