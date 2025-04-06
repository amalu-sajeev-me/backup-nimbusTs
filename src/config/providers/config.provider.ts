abstract class ConfigProvider <T>{
    abstract get(key: keyof T): string | undefined;
    abstract has(key: keyof T): boolean;
}

export { ConfigProvider };