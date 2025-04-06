abstract class CommandProvider {
  abstract execute(command: string, args?: string[]): Promise<CommandResult>;
  abstract executeWithOptions(command: string, options: CommandOptions): Promise<CommandResult>;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface CommandOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean | string;
}

export { CommandProvider };