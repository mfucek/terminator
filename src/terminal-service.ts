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
		// Send text without trailing newline, then send Enter separately.
		// Using sendText(text, false) avoids appending \n which some
		// interactive CLIs (like Claude Code) treat as a literal newline.
		terminal.sendText(text, false);
		vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
			text: '\r',
		});
	}
}
