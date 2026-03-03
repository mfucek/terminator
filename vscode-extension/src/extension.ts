import * as vscode from 'vscode';
import { TaskStore } from './taskStore';
import { TerminalService } from './terminalService';
import { SidebarProvider } from './sidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  const taskStore = new TaskStore(context.workspaceState);
  const terminalService = new TerminalService();
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    taskStore,
    terminalService,
  );

  context.subscriptions.push(taskStore);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('terminator.addTask', async () => {
      const text = await vscode.window.showInputBox({
        prompt: 'Enter task text',
        placeHolder: 'Task text...',
      });
      if (text) {
        taskStore.addTask(text);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('terminator.sendToTerminal', async () => {
      const tasks = taskStore.getAllTasks().filter(t => t.status === 'todo' || t.status === 'doing');
      if (tasks.length === 0) {
        vscode.window.showInformationMessage('No tasks to send.');
        return;
      }
      const picked = await vscode.window.showQuickPick(
        tasks.map(t => ({ label: t.text.split('\n')[0], description: t.status, id: t.id })),
        { placeHolder: 'Pick a task to send' },
      );
      if (!picked) { return; }
      const task = taskStore.getById(picked.id);
      if (!task) { return; }
      const terminals = vscode.window.terminals;
      const terminalItems = [
        ...terminals.map(t => ({ label: t.name })),
        { label: '$(plus) Create New Terminal' },
      ];
      const termPicked = await vscode.window.showQuickPick(terminalItems, {
        placeHolder: 'Select a terminal',
      });
      if (!termPicked) { return; }
      let terminal: vscode.Terminal;
      if (termPicked.label === '$(plus) Create New Terminal') {
        terminal = terminalService.createTerminal();
      } else {
        const found = terminals.find(t => t.name === termPicked.label);
        if (!found) { return; }
        terminal = found;
      }
      terminalService.sendText(terminal, task.text);
      if (task.status === 'todo') {
        taskStore.updateStatus(task.id, 'doing');
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('terminator.completeTask', async () => {
      const doing = taskStore.getAllTasks().filter(t => t.status === 'doing');
      if (doing.length === 0) {
        vscode.window.showInformationMessage('No active tasks to complete.');
        return;
      }
      const picked = await vscode.window.showQuickPick(
        doing.map(t => ({ label: t.text.split('\n')[0], id: t.id })),
        { placeHolder: 'Pick a task to complete' },
      );
      if (!picked) { return; }
      taskStore.updateStatus(picked.id, 'done');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('terminator.deleteTask', async () => {
      const done = taskStore.getAllTasks().filter(t => t.status === 'done');
      if (done.length === 0) {
        vscode.window.showInformationMessage('No completed tasks to delete.');
        return;
      }
      const picked = await vscode.window.showQuickPick(
        done.map(t => ({ label: t.text.split('\n')[0], id: t.id })),
        { placeHolder: 'Pick a task to delete' },
      );
      if (!picked) { return; }
      taskStore.deleteTask(picked.id);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('terminator.editTask', async () => {
      const tasks = taskStore.getAllTasks().filter(t => t.status !== 'done');
      if (tasks.length === 0) {
        vscode.window.showInformationMessage('No tasks to edit.');
        return;
      }
      const picked = await vscode.window.showQuickPick(
        tasks.map(t => ({ label: t.text.split('\n')[0], id: t.id })),
        { placeHolder: 'Pick a task to edit' },
      );
      if (!picked) { return; }
      const task = taskStore.getById(picked.id);
      if (!task) { return; }
      const newText = await vscode.window.showInputBox({
        prompt: 'Edit task text',
        value: task.text,
      });
      if (newText !== undefined) {
        taskStore.updateText(task.id, newText);
      }
    }),
  );
}

export function deactivate() {}
