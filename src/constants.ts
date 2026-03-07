import * as vscode from 'vscode';

export const SOURCE_PATTERN = /source\s*=\s*"([^"]+)"/g;

export const GET_REPO_ROOT_PATTERN = /^\$\{get_repo_root\(\)\}/;

export const REMOTE_PREFIXES: readonly string[] = [
  'git::',
  'github.com',
  'registry.terraform.io',
  'tfr://',
  's3::',
  'gcs::',
  'http://',
  'https://',
];

export const TARGET_FILES: readonly string[] = ['main.tf'];

export const HCL_SELECTOR: vscode.DocumentSelector = [
  { language: 'hcl', scheme: 'file' },
  { pattern: '**/terragrunt.hcl', scheme: 'file' },
];
