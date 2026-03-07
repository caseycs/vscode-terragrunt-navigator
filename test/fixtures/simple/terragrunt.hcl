terraform {
  source = "${get_repo_root()}/modules/vpc///."
}

inputs = {
  name = "my-vpc"
}
