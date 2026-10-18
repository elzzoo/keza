import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const actions = {
  list: ['list_claude_code_tasks', () => ({})],
  start: ['start_claude_code_task', (value) => JSON.parse(value)],
  status: ['get_claude_code_task', (id) => ({ id })],
  diff: ['get_claude_code_diff', (id) => ({ id })],
  review: ['ask_claude_readonly', (prompt) => ({ prompt })],
};

const [action, value] = process.argv.slice(2);
if (!actions[action] || (action !== 'list' && !value)) {
  process.stderr.write('Usage: node client.mjs list|start <json>|status <id>|diff <id>|review <prompt>\n');
  process.exit(2);
}

const client = new Client({ name: 'keza-claude-local-client', version: '0.1.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [new URL('./server.mjs', import.meta.url).pathname] }));
  const [name, argumentsFor] = actions[action];
  const result = await client.callTool({ name, arguments: argumentsFor(value) });
  process.stdout.write(`${result.content.map((part) => part.text ?? '').join('\n')}\n`);
  if (result.isError) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  await client.close();
}
