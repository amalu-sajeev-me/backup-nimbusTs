import { singleton, inject } from 'tsyringe';
import { ShellCommandProvider } from './providers/shell.command.provider';
import { CommandResult, CommandOptions } from './providers/command.provider';

@singleton()
class CommandService {
  constructor(@inject(ShellCommandProvider) private commandProvider: ShellCommandProvider) {}

  async execute(command: string, args: string[] = []): Promise<CommandResult> {
    return this.commandProvider.execute(command, args);
  }

  async executeWithOptions(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    return this.commandProvider.executeWithOptions(command, options);
  }

  async executeInShell(shellCommand: string): Promise<CommandResult> {
    return this.commandProvider.executeWithOptions(shellCommand, { shell: true });
  }
}

export { CommandService };