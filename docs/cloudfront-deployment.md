# CloudFront Deployment

AWS-specific deployment notes for S3 + CloudFront.

This is the ASSG default and the policy the template code assumes: **main URL, trailing slash**. Your main URL can be a root domain or a subdomain, and it never uses `www`. Keep canonical tags, Open Graph URLs, JSON-LD URLs, internal links, and sitemap entries in that form. A project may choose another policy only if it updates all of them together.

Assumptions:

- S3 REST origin, not the S3 website endpoint.
    - Keep S3 Block Public Access enabled. Grant CloudFront access through OAC and the bucket policy.
- CloudFront access through OAC.
- One main domain: a root domain or a subdomain.
- The main domain has no `www.` prefix.
- Trailing slash is canonical.
- Static multi-page site with folder-based pages.

## 1. What The Viewer-Request Function Does

The function runs on every viewer request before CloudFront checks the cache.

It does three things:

1. **Main domain**
   - Uses the literal `www.` prefix. No host map. No CloudFront KeyValueStore.
   - Any `www.` address redirects to the same domain without `www.`.
     - `www.example.com/about/` → `301 https://example.com/about/`
     - `www.example.co.uk/about/` → `301 https://example.co.uk/about/`
     - `www.app.example.com/about/` → `301 https://app.example.com/about/`

2. **Canonical trailing slash**
   - Extensionless page paths without a slash redirect to the slash form.
     - `example.com/about` → `301 https://example.com/about/`
   - Root `/` is unchanged.
   - Paths containing a dot are treated as files.
   - `/media/*`, `/assets/*`, and `/meta-assets/*` are left alone by path normalization.

3. **Index fallback**
   - No Default Root Object needed. Slash paths resolve to `index.html`.
     - `/about/` → `/about/index.html`
     - `/` → `/index.html`

This function assumes every `www.` address redirects to its non-`www` version, matching ASSG's main-domain default. A project that deliberately uses `www` as its main address must invert the redirect and update every canonical URL.

Unknown paths still redirect before 404:

```text
/missing → 301 /missing/ → 404
```

## 2. Function Code

Create a CloudFront Function with runtime `cloudfront-js-2.0`.

```js
function toQueryString(querystring) {
    var parts = [];

    for (var key in querystring) {
        var entry = querystring[key];

        if (entry.multiValue) {
            for (var i = 0; i < entry.multiValue.length; i++) {
                parts.push(key + '=' + entry.multiValue[i].value);
            }
        } else {
            parts.push(key + '=' + entry.value);
        }
    }

    return parts.length ? '?' + parts.join('&') : '';
}

function handler(event) {
    var request = event.request;
    var host = request.headers.host.value.toLowerCase();
    var uri = request.uri;
    var query = toQueryString(request.querystring);

    // Dotted paths are files.
    var isAsset = uri.includes('.') ||
        uri === '/media' || uri.startsWith('/media/') ||
        uri === '/assets' || uri.startsWith('/assets/') ||
        uri === '/meta-assets' || uri.startsWith('/meta-assets/');

    // Main domain is canonical.
    var canonicalHost = host.startsWith('www.') ? host.slice(4) : host;
    var canonicalUri = uri;

    // Page URLs end with a slash.
    if (!isAsset && uri.length > 1 && !uri.endsWith('/')) {
        canonicalUri = uri + '/';
    }

    if (canonicalHost !== host || canonicalUri !== uri) {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                location: {
                    value: 'https://' + canonicalHost + canonicalUri + query
                }
            }
        };
    }

    // Slash paths resolve to index.html.
    if (!isAsset && !uri.includes('.')) {
        request.uri = uri + 'index.html';
    }

    return request;
}

```


### 3. Associate The Function

1. Open **CloudFront → Functions**.
2. Create the function with runtime `cloudfront-js-2.0`.
3. Paste the code.
4. Save and publish.
5. Open the distribution.
6. Go to **Behaviors**.
7. Edit the default cache behavior.
8. Under **Function associations**, set **Viewer request** to the function.
9. Choose the published version.
10. Save the behavior and wait for the distribution to deploy.

Only one viewer-request function can be associated with a cache behavior.

If the distribution already has a viewer-request function, merge the code instead of replacing it.

## 4. Custom Error Responses

An S3 REST origin behind OAC returns **403 AccessDenied** for missing objects. It may also return **404** depending on origin behavior.

Create custom error responses for both codes so that it returns the "Page Not Found" page instead of showing denied request.

**CloudFront → Distribution → Error pages → Create custom error response**

| Origin error | Response page path | HTTP response code | Error caching TTL |
|---|---|---|---|
| `403` | `/error.html` | `404` | `10` seconds |
| `404` | `/error.html` | `404` | `10` seconds |


Settings:
- Customize error response: **Yes**
- Response page path: `/error.html`
- HTTP response code: `404`
- Error caching minimum TTL: `10` seconds

`error.html` must exist at the origin root. This project ships it as `dist/error.html`.

Do not set the custom response code to `200`. That creates a soft 404.

Test with a unique missing path:

```bash
curl -i https://example.com/missing-path
```

Expected:

```text
HTTP/2 404
content-type: text/html
```

CloudFront caches error responses. Invalidate after changing error settings:

```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## 5. ACM Certificate

CloudFront requires a certificate in **us-east-1**.

Request or import a certificate that covers your main domain and, if used, its `www` alias:

- `example.com` or `app.example.com`
- `www.example.com` or `www.app.example.com`

A wildcard `*.example.com` covers one level below the root: `www.example.com` and `app.example.com`. It does **not** cover the root domain `example.com` or a two-level address such as `www.app.example.com`. Add those explicitly.

Steps:

1. Open **AWS Certificate Manager** in **us-east-1**.
2. Request a public certificate.
3. Add the required names as subject alternative names.
4. Validate through DNS.
5. Wait for status **Issued**.
6. Attach the certificate to the CloudFront distribution.

TLS terminates before the HTTP redirect. Every configured address needs valid certificate coverage even when one redirects to the other.

CloudFront accepts one certificate per distribution.

## 6. Alternate Domain Names And DNS

Add your main domain and, if used, its `www` alias:

**CloudFront → Distribution → General → Edit → Alternate domain names**

- `example.com` or `app.example.com`
- `www.example.com` or `www.app.example.com`

Attach the ACM certificate from section 5. Save and wait for deployment.

Set the cache behavior **Viewer protocol policy** to **Redirect HTTP to HTTPS**.

CloudFront will now answer on both addresses. The function redirects `www` to your main domain.

### Route 53

Create alias records for your main domain and, if used, its `www` alias:

- `example.com` or `app.example.com` → A/AAAA alias → CloudFront distribution
- `www.example.com` or `www.app.example.com` → A/AAAA alias → CloudFront distribution

Add IPv6 AAAA records if IPv6 is enabled. Route 53 alias records are free for CloudFront queries and work at your root domain.

### Third-Party DNS

`www` is a normal subdomain:

```text
www.example.com  CNAME  dxxxxxxxxxxxxx.cloudfront.net
www.app.example.com  CNAME  dxxxxxxxxxxxxx.cloudfront.net
```

If your main URL is a subdomain, point it at CloudFront with a normal CNAME. If your main URL is a root domain, use the provider's root-domain alias feature:

| Provider | Root domain record type |
|---|---|
| Route 53 | Alias A/AAAA |
| Cloudflare | CNAME flattening |
| Namecheap | ALIAS |
| DNSimple | ALIAS |
| DNS Made Easy | ANAME |
| easyDNS | ANAME |
| Name.com | ANAME |

The final result should look something like this in your third party DNS portal:

```text
@    ALIAS  dxxxxxxxxxxxxx.cloudfront.net
www  CNAME  dxxxxxxxxxxxxx.cloudfront.net
```

### Propagation And Verification

Wait for DNS propagation, then verify:

```bash
dig example.com
dig www.example.com
```

Both should resolve to CloudFront.

## 7. Cookies And Main Domain

One main domain avoids split sessions, but cookie scope still needs a decision.

- Host-only cookie on your main domain (`example.com` or `app.example.com`): sent only to that exact domain.
- `Domain=example.com`: sent to the root domain and every subdomain.
- `Domain=app.example.com`: sent only to that subdomain and its descendants.

With a main domain that has no `www`:

- Use `__Host-` cookies for host-only Secure cookies.
- `__Host-` requires `Secure`, `Path=/`, and no `Domain` attribute.
- If auth must span `app.example.com` and `api.example.com`, use `Domain=example.com` deliberately.
- If you need cookies isolated from sibling subdomains, keep them host-only.

The redirect removes the duplicate address. It does not replace cookie policy.

Also keep one origin in:

- CORS allowlists
- OAuth redirect URIs
- CSP `connect-src`
- Stripe and webhook callback URLs
- Email and social links
- Analytics properties

## 8. Deploy And Test

Test:

```bash
MAIN_DOMAIN=example.com  # or app.example.com

curl -I "https://$MAIN_DOMAIN/"
curl -I "https://$MAIN_DOMAIN/about"
curl -I "https://$MAIN_DOMAIN/about/"
curl -I "https://www.$MAIN_DOMAIN/about"
curl -I "https://$MAIN_DOMAIN/missing"
```

Expected:

| URL | Result |
|---|---|
| `/` | `200` |
| `/about` | `301 → /about/` |
| `/about/` | `200` |
| `www/about` | `301 → https://<main-domain>/about/` |
| `/missing` | `301 → /missing/`, then `404` |

Check the index fallback:

```bash
curl -I "https://$MAIN_DOMAIN/about/"
# 200
```

Check a real file path:

```bash
curl -I "https://$MAIN_DOMAIN/sitemap.xml"
# 200
```

