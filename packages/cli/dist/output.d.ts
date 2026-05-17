export declare function printJson(data: unknown): void;
export declare function printTable(rows: unknown[], columns: {
    key: string;
    label: string;
    width?: number;
}[]): void;
export declare function printError(err: unknown): never;
export declare function printSuccess(message: string): void;
export declare function printReplayed(): void;
