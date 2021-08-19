const vscode = require('vscode')
const { getWebviewContent } = require('./helpers/extension.helpers')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let interpretateCommand = vscode.commands.registerCommand(
    'env-viewer.interpretateEnv',
    function () {
      const panel = vscode.window.createWebviewPanel(
        'editor',
        'Env Editor',
        vscode.ViewColumn.Two
      )

      const fileContent = vscode.window.activeTextEditor.document.getText()
      panel.webview.html = getWebviewContent(fileContent)

      vscode.window.showInformationMessage('Interpretating...')
    }
  )

  context.subscriptions.push(interpretateCommand)
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
