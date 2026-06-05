# Deploy folder

## Quick start

```bash
cp deploy/secrets.template.env deploy/secrets.env
# Fill all __FILL_ME__ values in deploy/secrets.env
```

Then tell Cursor: **"secrets file ready — push and deploy"**

## Files

| File | Purpose |
|------|---------|
| `secrets.template.env` | Template — copy to `secrets.env` and fill |
| `secrets.env` | **Your secrets** (gitignored) |
| `HOSTINGER-GUIDE.md` | Full Hostinger step-by-step guide |

## Helper scripts

```bash
bash scripts/validate-secrets.sh    # check secrets.env is complete
bash scripts/print-hostinger-env.sh # copy-paste env vars for hPanel
bash scripts/git-push.sh            # push to GitHub (needs secrets.env)
```
