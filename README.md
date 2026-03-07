# Terragrunt Navigator

VS Code extension that makes `source` paths in Terragrunt HCL files navigable via **Ctrl+Click** and **F12 (Go to Definition)**.

## Features

- Resolves `${get_repo_root()}` to the actual git repository root
- Handles Terragrunt's `//` double-slash convention
- Skips remote sources (`git::`, `s3::`, `https://`, etc.)
- Ignores commented-out source lines

## Example

Given this `terragrunt.hcl`:

```hcl
terraform {
  source = "${get_repo_root()}/modules/aws-powerbi-gateway///."
}
```

**Ctrl+Click** or **F12** on the source path navigates to `modules/aws-powerbi-gateway/main.tf` in your repo.

## Supported source patterns

| Pattern | Resolves to |
|---------|-------------|
| `${get_repo_root()}/modules/vpc///."` | `<repo-root>/modules/vpc/main.tf` |
| `${get_repo_root()}/modules/vpc//` | `<repo-root>/modules/vpc/main.tf` |
| `${get_repo_root()}/modules/vpc` | `<repo-root>/modules/vpc/main.tf` |
| `..//modules/vpc` | `<relative-path>/modules/vpc/main.tf` |
| `git::https://...` | Skipped (remote) |

## Development

```bash
npm install
npm run compile
npm run test:unit
```

Press **F5** in VS Code to launch the Extension Development Host.
