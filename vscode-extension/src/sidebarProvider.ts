import * as vscode from 'vscode';
import { TaskStore } from './taskStore';
import { TerminalService } from './terminalService';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'terminator.taskView';
  private view?: vscode.WebviewView;
  private changeListener?: vscode.Disposable;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly taskStore: TaskStore,
    private readonly terminalService: TerminalService,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    // Dispose previous listener if the view is re-resolved
    this.changeListener?.dispose();
    this.changeListener = this.taskStore.onDidChange(() => this.updateWebview());

    webviewView.onDidDispose(() => {
      this.changeListener?.dispose();
      this.changeListener = undefined;
      this.view = undefined;
    });

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'addTask':
          this.taskStore.addTask(msg.text);
          break;

        case 'requestTerminals': {
          const terminals = this.terminalService.getTerminalList();
          this.view?.webview.postMessage({
            command: 'terminalList',
            taskId: msg.id,
            terminals,
          });
          break;
        }

        case 'sendToTerminalSelected': {
          const task = this.taskStore.getById(msg.id);
          if (!task) { return; }
          let terminal: import('vscode').Terminal | undefined;
          if (msg.createNew) {
            terminal = this.terminalService.createTerminal();
          } else {
            terminal = this.terminalService.getTerminalByIndex(msg.terminalIndex);
          }
          if (!terminal) { return; }
          this.terminalService.sendText(terminal, task.text);
          if (task.status === 'todo') {
            this.taskStore.updateStatus(msg.id, 'doing');
          }
          break;
        }

        case 'sendToActiveTerminal': {
          const activeTask = this.taskStore.getById(msg.id);
          if (!activeTask) { return; }
          const active = vscode.window.activeTerminal;
          const terminal = active || this.terminalService.createTerminal();
          this.terminalService.sendText(terminal, activeTask.text);
          if (activeTask.status === 'todo') {
            this.taskStore.updateStatus(msg.id, 'doing');
          }
          break;
        }

        case 'completeTask':
          this.taskStore.updateStatus(msg.id, 'done');
          break;

        case 'revertTask':
          this.taskStore.updateStatus(msg.id, 'todo');
          break;

        case 'deleteTask':
          this.taskStore.deleteTask(msg.id);
          break;

        case 'editTask':
          this.taskStore.updateText(msg.id, msg.text);
          break;

        case 'moveTask':
          this.taskStore.moveTask(msg.id, msg.status, msg.insertBeforeId);
          break;
      }
    });

    this.updateWebview();
  }

  updateWebview(): void {
    if (this.view) {
      this.view.webview.postMessage({
        command: 'updateTasks',
        tasks: this.taskStore.getAllTasks(),
      });
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css'),
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${cssUri}" rel="stylesheet">
  <title>Terminator Tasks</title>
</head>
<body>
  <div class="input-area">
    <textarea id="task-input" placeholder="Enter a task..." rows="3"></textarea>
    <button id="add-btn" class="add-btn">Add Task</button>
  </div>

  <div class="sections-container">
    <div class="section" id="todo-section">
      <div class="section-header">
        <span class="chevron">▸</span>
        Todo
        <span class="badge" id="todo-badge">0</span>
      </div>
      <div class="section-body" id="todo-body"></div>
    </div>

    <div class="resize-handle" data-above="todo-section" data-below="doing-section"></div>

    <div class="section" id="doing-section">
      <div class="section-header">
        <span class="chevron">▸</span>
        Doing
        <span class="badge" id="doing-badge">0</span>
      </div>
      <div class="section-body" id="doing-body"></div>
    </div>

    <div class="resize-handle" data-above="doing-section" data-below="done-section"></div>

    <div class="section" id="done-section">
      <div class="section-header">
        <span class="chevron">▸</span>
        Done
        <span class="badge" id="done-badge">0</span>
      </div>
      <div class="section-body" id="done-body"></div>
    </div>
  </div>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
