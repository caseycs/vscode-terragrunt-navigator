locals {
  path = read_terragrunt_config(find_in_parent_folders("path_vars.hcl")).locals
}

dependency "network" {
  config_path = "${get_repo_root()}/test/fixtures/with-deps-dynamic/gcp-${local.path.gcp_project_id}-${local.path.gcp_region}/network"
}
