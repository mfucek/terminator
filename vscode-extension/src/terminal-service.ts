import * as vscode from 'vscode';

export interface TerminalInfo {
	name: string;
	index: number;
}

export class TerminalService {
	getTerminalList(): TerminalInfo[] {
		return vscode.window.terminals.map((t, i) => ({
			name: t.name,
			index: i,
		}));
	}

	getTerminalByIndex(index: number): vscode.Terminal | undefined {
		return vscode.window.terminals[index];
	}

	createTerminal(): vscode.Terminal {
		return vscode.window.createTerminal('Terminator');
	}

	sendText(terminal: vscode.Terminal, text: string): void {
		terminal.show(true);
		terminal.sendText(text);
	}
}
