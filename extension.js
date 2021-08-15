const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let interpretateCommand = vscode.commands.registerCommand('env-viewer.interpretateEnv', function () {
		vscode.window.showInformationMessage('Interpretating...');
	});

	context.subscriptions.push(interpretateCommand);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
