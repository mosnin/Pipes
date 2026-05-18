import { Command } from "commander";
import { writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import chalk from "chalk";
import yaml from "js-yaml";
import { configFilePath } from "../config.js";

const DEFAULT_API = "https://app.pipes.sh";

interface GlobalOpts {
  api?: string;
  token?: string;
}

async function prompt(question: string, defaultValue = ""): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const suffix = defaultValue ? chalk.dim(` [${defaultValue}]`) : "";
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a .pipes.yml config file in the current directory")
    .option("--api <url>", "Pipes API URL")
    .option("--token <token>", "Agent token (from Settings -> API Tokens)")
    .action(async (opts: { api?: string; token?: string }) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const configPath = configFilePath();

      if (existsSync(configPath)) {
        console.error(chalk.yellow(`! .pipes.yml already exists at ${configPath}`));
        console.error("  Delete it first or edit it manually.");
        process.exit(1);
      }

      console.log(chalk.bold("Pipes project setup\n"));

      const api = await prompt("API URL", opts.api ?? global.api ?? DEFAULT_API);
      const token = opts.token ?? global.token ?? (await prompt("Token (from Settings -> API Tokens)"));

      if (!token) {
        console.error(chalk.red("\nToken is required. Create one at Settings -> API Tokens."));
        process.exit(1);
      }

      writeFileSync(configPath, yaml.dump({ api, token }), "utf8");

      console.log();
      console.log(chalk.green(`✓ Written ${configPath}`));
      console.log();
      console.log(chalk.yellow("Keep your token secret — add .pipes.yml to .gitignore:"));
      console.log(chalk.dim("  echo '.pipes.yml' >> .gitignore"));
    });
}
