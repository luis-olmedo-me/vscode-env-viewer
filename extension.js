const vscode = require('vscode')
const { parse } = require('dotenv')

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

const envKeys = {
  ENV_TEMPLATE: 'env-template',
  ENV_MODE: 'env-mode',
  ENV_VALUE: 'env-value',
}

function getEnvValues(allValues, key) {
  const toCut = `// @${key}`

  let shouldKeepLooking = true
  let envValues = []
  let carriedIndex = 0

  while (shouldKeepLooking) {
    const firstIndex = allValues.indexOf(toCut, carriedIndex)
    const lastIndex = allValues.indexOf('// @', firstIndex + 1)
    const validatedLastIndex = lastIndex !== -1 ? lastIndex : allValues.length

    const newValue = allValues.slice(firstIndex, validatedLastIndex).trim()

    if (newValue) {
      carriedIndex = validatedLastIndex
      envValues = [...envValues, newValue]
    } else {
      shouldKeepLooking = false
    }
  }

  return envValues
}

function getWebviewContent(fileContent) {
  const envTemplate = getEnvValues(fileContent, envKeys.ENV_TEMPLATE)
  const envMode = getEnvValues(fileContent, envKeys.ENV_MODE)
  const envValue = getEnvValues(fileContent, envKeys.ENV_VALUE)

  const parsedEnvTemplate = parse(envTemplate)
  const envTemplateHTML = Object.keys(parsedEnvTemplate).map((envKey) => {
    const value = parsedEnvTemplate[envKey]
    const formattedValue = `${envKey}: `

    return `
		<tr>
				<td>${formattedValue}</td>
				<td><input type="text" value="${value}"/></td>
		</tr>
		`
  })

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
			<table>
					<tr>
							<th>KEY</th>
							<th>VALUE</th>
					</tr>
					${envTemplateHTML.join('')}
			</table>

			<p>${envMode.join(' ')}</p>

			<p>${envValue.join(' ')}</p>
	</body>
	</html>
	`
}
