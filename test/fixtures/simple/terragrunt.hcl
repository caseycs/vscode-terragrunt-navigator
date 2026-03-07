terraform {
  source = "${get_repo_root()}/test/fixtures/simple/modules/vpc///."
}

inputs = {
  name = "my-vpc"
}
