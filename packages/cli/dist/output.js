import chalk from "chalk";
export function printJson(data) {
    console.log(JSON.stringify(data, null, 2));
}
export function printTable(rows, columns) {
    if (rows.length === 0) {
        console.log(chalk.dim("(no results)"));
        return;
    }
    const cell = (row, key) => {
        if (row && typeof row === "object" && key in row) {
            return String(row[key] ?? "");
        }
        return "";
    };
    const widths = columns.map((col) => {
        const maxData = Math.max(...rows.map((r) => cell(r, col.key).length));
        return Math.max(col.label.length, maxData, col.width ?? 0);
    });
    const header = columns
        .map((col, i) => chalk.bold(col.label.padEnd(widths[i])))
        .join("  ");
    const divider = widths.map((w) => "-".repeat(w)).join("  ");
    console.log(header);
    console.log(chalk.dim(divider));
    for (const row of rows) {
        const line = columns
            .map((col, i) => cell(row, col.key).padEnd(widths[i]))
            .join("  ");
        console.log(line);
    }
}
export function printError(err) {
    if (err instanceof Error) {
        console.error(chalk.red(`Error: ${err.message}`));
    }
    else {
        console.error(chalk.red(String(err)));
    }
    process.exit(1);
}
export function printSuccess(message) {
    console.log(chalk.green(`✓ ${message}`));
}
export function printReplayed() {
    console.log(chalk.dim("(replayed — idempotency key already used)"));
}
