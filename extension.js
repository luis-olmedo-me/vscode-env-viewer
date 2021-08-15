const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let interpretateCommand = vscode.commands.registerCommand('env-viewer.interpretateEnv', function () {
		const panel = vscode.window.createWebviewPanel(
			'editor',
			'Env Editor',
			vscode.ViewColumn.Two
		);
		
		const fileContent = vscode.window.activeTextEditor.document.getText();
		panel.webview.html = getWebviewContent(fileContent);

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



function getWebviewContent(fileContent) {
	return `
	<!DOCTYPE html>

	<html lang="en">
	<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Env Editor</title>
	</head>
	<body>
			<h1>Env Editor</h1>
			<p>${fileContent}</p>
	</body>
	</html>
	`;
}