# Terragrunt Navigator

VS Code extension that makes `source` and `config_path` paths in Terragrunt HCL files Ctrl+Click navigable.

## Features

- Resolves `${get_repo_root()}` to the actual git repository root
- Handles Terragrunt's `//` double-slash convention
- Navigates `config_path` in `dependency` blocks to the target `terragrunt.hcl`
- Resolves dynamic interpolations (e.g. `${local.*}`) via `terragrunt render --json` on click
- Skips remote sources (`git::`, `s3::`, `https://`, etc.)
- Ignores commented-out lines

## Examples

### Static source path

```hcl
terraform {
  source = "${get_repo_root()}/modules/vpc///."
}
```

**Ctrl+Click** navigates to `modules/vpc/main.tf`.

### Dependency with static config_path

```hcl
dependency "vpc" {
  config_path = "${get_repo_root()}/tg/vpc"
}
```

**Ctrl+Click** navigates to `tg/vpc/terragrunt.hcl`.

### Dependency with dynamic config_path

```hcl
locals {
  path = read_terragrunt_config(find_in_parent_folders("path_vars.hcl")).locals
}

dependency "network" {
  config_path = "${get_repo_root()}/infra/gcp-${local.path.gcp_project_id}-${local.path.gcp_region}/network"
}
```

**Ctrl+Click** runs `terragrunt render --json` to resolve the interpolations, then navigates to the resolved `terragrunt.hcl`.

## Supported patterns

| Pattern | Resolves to |
|---------|-------------|
| `source = "${get_repo_root()}/modules/vpc///."` | `<repo-root>/modules/vpc/main.tf` |
| `source = "..//modules/vpc"` | `<relative-path>/modules/vpc/main.tf` |
| `config_path = "${get_repo_root()}/tg/vpc"` | `<repo-root>/tg/vpc/terragrunt.hcl` |
| `config_path = ".../${local.var}/vpc"` | Resolved via `terragrunt render --json` |
| `source = "git::https://..."` | Skipped (remote) |

## Development

```bash
npm install
npm run compile
npm run test:unit
```
