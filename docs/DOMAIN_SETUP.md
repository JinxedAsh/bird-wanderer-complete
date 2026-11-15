# Bird Wanderer stable domain

The application address is **https://birdwanderer.in**. Registration stays at GoDaddy; Cloudflare hosts DNS and routes the named tunnel to the laptop's existing app at `http://127.0.0.1:3000`. The laptop, app server and connector must remain running. This is stable laptop-backed access, not permanent backend hosting.

## Start or resume

From the repository folder in PowerShell:

```powershell
.\Start-Domain.ps1
```

The script reuses the existing frontend and named connector when present. If neither project port is occupied, it starts the existing development supervisor. It refuses an unexpected frontend or an orphaned API port instead of killing processes. Logs go outside the repository under the user's `.cache/bird-wanderer-android/server-logs` directory. No Windows service or automatic boot task is installed.

The private connector token is in the user's `.config/bird-wanderer/cloudflare-tunnel-token` file, outside the repository. The script passes only that file's path to cloudflared, never its contents. Firebase's separate private service-account file also remains outside the repository. Never commit, share or print either credential.

`frontend/.env` must contain `TUNNEL_ORIGIN=https://birdwanderer.in`. Existing application code allows that exact frontend hostname and API origin. No wildcard host allowance or port forwarding is needed. Do not run the old quick-tunnel helper alongside an existing dev server; it attempts to start another server on port 3000.

## DNS and activation

Assigned Cloudflare nameservers: `brianna.ns.cloudflare.com` and `tosana.ns.cloudflare.com`. The user explicitly approved the GoDaddy delegation and persistent named tunnel. Existing `www`, `_domainconnect` and `_dmarc` records were copied to Cloudflare; GoDaddy parking and its old authority NS/SOA were not imported. A new proxied root CNAME points to the named tunnel. The tested application hostname is the root domain; `www` application routing is not accepted from the preserved alias alone.

**28 October 2026 verified checkpoint:** the connector is Healthy and the root application route is saved. Google's public DNS shows Cloudflare's assigned nameservers and the domain's public IPv4 records. HTTPS using those public DNS results passes normal hostname/certificate verification and returns frontend200 (Bird Wanderer HTML), empty-login validation400 and protected push configuration401. Local Host/Origin checks also pass. Startup script parsing and reuse of running processes passed. No runtime source, design, account or database changes were required.

The laptop's Wi-Fi DNS resolver still returned ENOTFOUND after the public records became available; clearing the Windows DNS cache did not change that upstream result. This is distinct from a stopped server or invalid certificate. Test from another network, such as phone mobile data, or wait for that resolver's negative cache to expire. The HTTPS evidence above explicitly used Google's public DNS answer with ordinary TLS verification; it does not claim that the laptop's default resolver was already fixed. Restarting the app or tunnel cannot fix an upstream DNS cache.

Enter the stable HTTPS address in Android's server connection screen once it resolves on that device. Changing origins intentionally clears local login and push consent; sign in and deliberately enable push again. Existing server records remain intact. Authenticated phone acceptance and foreground/background Firebase receipt remain pending.
