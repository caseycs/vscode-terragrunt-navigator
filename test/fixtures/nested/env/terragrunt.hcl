terraform {
  source = "${get_repo_root()}/modules/rds///."
}

# source = "${get_repo_root()}/modules/ignored///."

inputs = {
  instance_class = "db.t3.micro"
}
