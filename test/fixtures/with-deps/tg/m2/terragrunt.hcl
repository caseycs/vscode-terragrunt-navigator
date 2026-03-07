locals {
  path = read_terragrunt_config(find_in_parent_folders("path_vars.hcl")).locals
}

dependency "app" {
  config_path = "${get_repo_root()}/test/fixtures/with-deps/${local.path.tg}/m1"
}
