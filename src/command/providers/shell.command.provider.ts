import { singleton } from 'tsyringe';
import { spawn } from 'child_process';
import { CommandProvider, CommandResult, CommandOptions } from './command.provider';

@singleton()
class ShellCommandProvider extends CommandProvider {
  async execute(command: string, args: string[] = []): Promise<CommandResult> {
    return this.executeWithOptions(command, { args });
  }

  async executeWithOptions(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    const { args = [], cwd, env, timeout, shell = true } = options;

    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        cwd,
        env: env ? { ...process.env, ...env } : process.env,
        shell,
      });

      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      let timeoutId: NodeJS.Timeout | undefined;
      
      if (timeout) {
        timeoutId = setTimeout(() => {
          childProcess.kill();
          resolve({
            stdout,
            stderr: stderr + '\nCommand execution timed out',
            exitCode: 124, // Common timeout exit code
            success: false,
          });
        }, timeout);
      }

      childProcess.on('close', (exitCode) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        resolve({
          stdout,
          stderr,
          exitCode: exitCode ?? 1,
          success: exitCode === 0,
        });
      });

      childProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        resolve({
          stdout,
          stderr: error.message,
          exitCode: 1,
          success: false,
        });
      });
    });
  }
}

export { ShellCommandProvider };