# Publishing Bazi and connecting bazi.com

The connected public site is https://aryaaupa.github.io/bazi/ and its workspace is https://aryaaupa.github.io/bazi/app/. Both are built from this repository. The demo works without a custom domain.

## First, confirm the registrar account

The cofounder may already own bazi.com. Find it in their registrar account and confirm that the domain registration or transfer has completed. A public registration record alone cannot tell us whether this team currently controls the domain.

The important distinction: buying a domain gives you control of its name and DNS. It does not connect that name to this website automatically. If the domain is already in your account, the remaining work is DNS and GitHub Pages configuration.

If it is absent from the registrar account, ask for the purchase or transfer confirmation before making any domain-specific changes. Do not buy a replacement domain solely because the current routing is broken.

## One public host

Use the existing GitHub Pages deployment as the public host. This keeps the homepage and application together:

| Entry | Default host | After the custom domain is connected |
| --- | --- | --- |
| Homepage | https://aryaaupa.github.io/bazi/ | https://bazi.com/ |
| Workspace | https://aryaaupa.github.io/bazi/app/ | https://bazi.com/app/ |
| Guided demo | https://aryaaupa.github.io/bazi/app/#patient/BZ-001?guided=1 | https://bazi.com/app/#patient/BZ-001?guided=1 |

All website URLs and service-worker paths are relative. The same build works under the repository prefix or at the domain root. Legacy app and demo links redirect to the connected application.

The private ChatGPT Sites publication is a review copy of this build. Use the public GitHub Pages URL for external demos.

## Configure GitHub before changing DNS

1. Sign in to GitHub with an account that can administer aryaaupa/bazi.
2. Open https://github.com/aryaaupa/bazi/settings/pages.
3. Confirm **Build and deployment → Source → GitHub Actions**. The workflow publishes dist/ from main.
4. Verify the owned domain under GitHub account **Settings → Pages** using the exact TXT verification record GitHub provides. Keep that record in DNS.
5. In the repository's Pages settings, enter **bazi.com** under **Custom domain** and save.
6. Configure the website DNS records below in the registrar or DNS provider account.

With this repository's custom Actions workflow, the custom domain is configured in Pages settings. A CNAME file in source is not required or honored for that custom workflow.

## Exact DNS records for this repository

Use these records for bazi.com. The host field may be called “Name” or “Record name”; most providers use @ for the domain root.

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | aryaaupa.github.io |

Use your provider's automatic or default TTL. Replace conflicting website A/AAAA/CNAME/URL-forwarding records for @ and www. Preserve email MX records, SPF/DKIM/DMARC TXT records, and other services. Do not change nameservers unless DNS is deliberately being moved to another provider.

If the provider requires IPv6 records, GitHub's published AAAA values are:

| Type | Name | Value |
| --- | --- | --- |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |

The www CNAME target has no https:// prefix and no /bazi/ suffix. It points to the GitHub account host, not a repository URL.

## Verify and enable HTTPS

1. Wait for GitHub's DNS check to pass. DNS updates can take time to propagate.
2. Enable **Enforce HTTPS** when the certificate is available. GitHub documents that this option can take up to 24 hours to become available.
3. Test https://bazi.com/ and https://www.bazi.com/. With bazi.com selected as the custom domain and both DNS variants configured, www redirects to the apex.
4. Test /app/, /app/#patient/BZ-001?guided=1, and /demo.html.
5. Keep the working GitHub URL handy until the domain and HTTPS are verified.

Public DNS queries on October 4, 2026 returned SERVFAIL for bazi.com A, AAAA, NS, and www CNAME through Google's resolver. That result does not establish domain ownership or the cause of the DNS failure. The registrar account and its nameserver configuration need to be checked before diagnosing it.

No registrar-account or DNS change was made by this implementation. No domain purchase, offer, or transfer was made.

Official sources:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Separate real-data environment

The public build excludes Supabase configuration, SQL, partner data, and runtime secrets. Existing backend scaffolding remains in source control. Connecting real participants, authenticated providers, or production integrations requires a separately reviewed environment and validation pathway.
