abstract class StorageProvider {
    abstract save<TInput = unknown, TResult = unknown>(data: TInput): Promise<TResult>;
    abstract delete<TInput = unknown, TResult = unknown>(id: TInput): Promise<TResult>;
}

export { StorageProvider };