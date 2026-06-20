import { Command } from "commander";
import chalk from "chalk";

const BASH_COMPLETION = `
_pipes_completion() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="init capabilities systems schema versions graph validate templates comments memory mcp-server completion"
  COMPREPLY=($\(compgen -W "$commands" -- "$cur"\))
}
complete -F _pipes_completion pipes
`;

const ZSH_COMPLETION = `
#compdef pipes
_pipes() {
  local commands
  commands=(
    'init:Create .pipes.yml config file'
    'capabilities:Print CLI manifest'
    'systems:Manage systems'
    'schema:Import and export schemas'
    'versions:Manage version snapshots'
    'graph:Read and mutate system graphs'
    'validate:Get validation report'
    'templates:Browse and instantiate templates'
    'comments:Add comments to systems'
    'memory:Store and search memory records'
    'mcp-server:Start MCP server'
    'completion:Output shell completion script'
  )
  _describe 'pipes commands' commands
}
_pipes
`;

const FISH_COMPLETION = `
complete -c pipes -f
complete -c pipes -n '__fish_use_subcommand' -a 'init' -d 'Create .pipes.yml config file'
complete -c pipes -n '__fish_use_subcommand' -a 'capabilities' -d 'Print CLI manifest'
complete -c pipes -n '__fish_use_subcommand' -a 'systems' -d 'Manage systems'
complete -c pipes -n '__fish_use_subcommand' -a 'schema' -d 'Import and export schemas'
complete -c pipes -n '__fish_use_subcommand' -a 'versions' -d 'Manage version snapshots'
complete -c pipes -n '__fish_use_subcommand' -a 'graph' -d 'Read and mutate system graphs'
complete -c pipes -n '__fish_use_subcommand' -a 'validate' -d 'Get validation report'
complete -c pipes -n '__fish_use_subcommand' -a 'templates' -d 'Browse and instantiate templates'
complete -c pipes -n '__fish_use_subcommand' -a 'comments' -d 'Add comments'
complete -c pipes -n '__fish_use_subcommand' -a 'memory' -d 'Store and search memory'
complete -c pipes -n '__fish_use_subcommand' -a 'mcp-server' -d 'Start MCP server'
`;

export function registerCompletion(program: Command): void {
  program
    .command("completion")
    .description("Output shell completion script")
    .option("--shell <shell>", "Shell type: bash, zsh, fish (default: bash)")
    .action((opts: { shell?: string }) => {
      const shell = opts.shell ?? "bash";
      switch (shell) {
        case "bash":
          process.stdout.write(BASH_COMPLETION.trim() + "\n");
          break;
        case "zsh":
          process.stdout.write(ZSH_COMPLETION.trim() + "\n");
          break;
        case "fish":
          process.stdout.write(FISH_COMPLETION.trim() + "\n");
          break;
        default:
          console.error(
            chalk.red(`Unknown shell: ${shell}. Supported: bash, zsh, fish`)
          );
          process.exit(1);
      }
    });
}
