terraform {
  source = "${get_repo_root()}/test/fixtures/no-main-tf/modules/storage///."
}

inputs = {
  bucket_name = "my-bucket"
}
