locals {
  # gcp
  gcp_regex      = try(regex("/gcp-(?P<project_id>.*?)-(?P<region>\\w+\\-\\w+\\d)/", get_original_terragrunt_dir()), null)
  gcp_project_id = try(local.gcp_regex["project_id"], null)
  gcp_region     = try(local.gcp_regex["region"], null)
}
