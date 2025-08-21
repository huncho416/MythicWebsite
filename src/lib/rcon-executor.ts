import { supabase } from '@/integrations/supabase/client';

export interface RCONConfig {
  host: string;
  port: number;
  password: string;
  timeout?: number;
}

export interface CommandExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * RCON Command Executor
 * Note: This is a client-side interface. In production, RCON commands should be executed
 * server-side for security reasons as they contain sensitive server credentials.
 */
export class RCONExecutor {
  private config: RCONConfig;

  constructor(config: RCONConfig) {
    this.config = config;
  }

  /**
   * Execute a command via RCON
   * In production, this should be implemented server-side
   */
  async executeCommand(command: string): Promise<CommandExecutionResult> {
    try {
      // TODO: Implement actual RCON connection
      // This is a placeholder that would need to be implemented server-side
      // For security reasons, RCON should never be executed from the client
      
      console.warn('RCON execution should be implemented server-side for security');
      
      // Simulate command execution for development
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        response: `Command executed: ${command}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Command Queue Processor
 * Processes pending command execution logs
 */
export class CommandQueueProcessor {
  private rconConfig: RCONConfig | null = null;

  constructor(rconConfig?: RCONConfig) {
    this.rconConfig = rconConfig || null;
  }

  /**
   * Process all pending commands
   */
  async processPendingCommands(): Promise<void> {
    if (!this.rconConfig) {
      console.warn('No RCON configuration provided, skipping command processing');
      return;
    }

    // Get pending commands
    const { data: pendingCommands, error } = await supabase
      .from('command_execution_logs')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Only retry up to 3 times
      .order('created_at', { ascending: true })
      .limit(10); // Process in batches

    if (error) {
      console.error('Error fetching pending commands:', error);
      return;
    }

    if (!pendingCommands || pendingCommands.length === 0) {
      console.log('No pending commands to process');
      return;
    }

    const executor = new RCONExecutor(this.rconConfig);

    for (const commandLog of pendingCommands) {
      await this.processCommand(executor, commandLog);
    }
  }

  /**
   * Process a single command
   */
  private async processCommand(executor: RCONExecutor, commandLog: any): Promise<void> {
    try {
      // Update attempts count
      const newAttempts = (commandLog.attempts || 0) + 1;
      
      await supabase
        .from('command_execution_logs')
        .update({
          attempts: newAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', commandLog.id);

      // Execute the command
      const result = await executor.executeCommand(commandLog.command);

      if (result.success) {
        // Command succeeded
        await supabase
          .from('command_execution_logs')
          .update({
            status: 'completed',
            executed_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', commandLog.id);

        console.log(`Command executed successfully: ${commandLog.command}`);
      } else {
        // Command failed
        const maxAttempts = commandLog.max_attempts || 3;
        const finalStatus = newAttempts >= maxAttempts ? 'failed' : 'pending';

        await supabase
          .from('command_execution_logs')
          .update({
            status: finalStatus,
            error_message: result.error || 'Command execution failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', commandLog.id);

        console.error(`Command failed (attempt ${newAttempts}/${maxAttempts}): ${commandLog.command}`, result.error);
      }
    } catch (error) {
      console.error('Error processing command:', error);
      
      // Mark as failed if max attempts reached
      const newAttempts = (commandLog.attempts || 0) + 1;
      const maxAttempts = commandLog.max_attempts || 3;
      const finalStatus = newAttempts >= maxAttempts ? 'failed' : 'pending';

      await supabase
        .from('command_execution_logs')
        .update({
          status: finalStatus,
          error_message: error instanceof Error ? error.message : 'Processing error',
          updated_at: new Date().toISOString()
        })
        .eq('id', commandLog.id);
    }
  }

  /**
   * Retry a specific failed command
   */
  async retryCommand(commandLogId: string): Promise<void> {
    if (!this.rconConfig) {
      throw new Error('No RCON configuration provided');
    }

    const { data: commandLog, error } = await supabase
      .from('command_execution_logs')
      .select('*')
      .eq('id', commandLogId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch command log: ${error.message}`);
    }

    const executor = new RCONExecutor(this.rconConfig);
    await this.processCommand(executor, commandLog);
  }

  /**
   * Get RCON configuration from environment or database
   */
  static async getRCONConfig(): Promise<RCONConfig | null> {
    // First try to get from environment variables
    if (typeof process !== 'undefined' && process.env) {
      const host = process.env.RCON_HOST;
      const port = process.env.RCON_PORT;
      const password = process.env.RCON_PASSWORD;

      if (host && port && password) {
        return {
          host,
          port: parseInt(port, 10),
          password,
          timeout: parseInt(process.env.RCON_TIMEOUT || '5000', 10)
        };
      }
    }

    // Fallback to database configuration (for admin settings)
    try {
      const { data: settings, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'rcon_config')
        .single();

      if (error || !settings) {
        return null;
      }

      const config = typeof settings.value === 'string' 
        ? JSON.parse(settings.value) 
        : settings.value;
      return {
        host: config.host,
        port: config.port,
        password: config.password,
        timeout: config.timeout || 5000
      };
    } catch (error) {
      console.error('Error fetching RCON config from database:', error);
      return null;
    }
  }
}

/**
 * Initialize and start the command queue processor
 * This should be called on the server-side in a background job
 */
export async function startCommandProcessor(): Promise<CommandQueueProcessor | null> {
  const rconConfig = await CommandQueueProcessor.getRCONConfig();
  
  if (!rconConfig) {
    console.warn('No RCON configuration found, command processor not started');
    return null;
  }

  const processor = new CommandQueueProcessor(rconConfig);
  
  console.log('Starting command queue processor...');
  
  // Process commands immediately
  await processor.processPendingCommands();
  
  // Set up periodic processing (every 30 seconds)
  setInterval(async () => {
    try {
      await processor.processPendingCommands();
    } catch (error) {
      console.error('Error in command queue processor:', error);
    }
  }, 30000);

  return processor;
}

/**
 * Manual command execution for admin panel
 */
export async function executeManualCommand(username: string, command: string): Promise<CommandExecutionResult> {
  const rconConfig = await CommandQueueProcessor.getRCONConfig();
  
  if (!rconConfig) {
    return {
      success: false,
      error: 'RCON configuration not available'
    };
  }

  const executor = new RCONExecutor(rconConfig);
  
  // Log the manual command execution
  const { data: commandLog, error: logError } = await supabase
    .from('command_execution_logs')
    .insert({
      username,
      command,
      status: 'pending',
      max_attempts: 1,
      attempts: 0
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to log manual command:', logError);
  }

  const result = await executor.executeCommand(command);

  // Update the log with the result
  if (commandLog) {
    await supabase
      .from('command_execution_logs')
      .update({
        status: result.success ? 'completed' : 'failed',
        executed_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
        attempts: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', commandLog.id);
  }

  return result;
}
