export interface PipesConfig {
    api: string;
    token: string;
    memory_system_id?: string;
}
export declare function loadConfig(overrides?: Partial<PipesConfig>): PipesConfig;
export declare function configFilePath(): string;
