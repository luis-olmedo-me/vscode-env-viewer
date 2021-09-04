const vscode = require('vscode')
const { parse } = require('dotenv')

class EnvironmentHandler {
  constructor() {
    this.file = null
    this.lines = []
    this.template = {}
    this.modes = {}
    this.values = {}
  }

  setFile(file) {
    const fileContent = file.document.getText()

    this.file = file
    this.lines = fileContent.split('\r\n')

    this.readEnvironment()
  }

  readEnvironment() {
    const parsedLines = getValuesArray(this.lines)

    parsedLines[envKeys.ENV_MODE] = formatGroupLines(
      parsedLines[envKeys.ENV_MODE]
    )

    parsedLines[envKeys.ENV_VALUE] = formatGroupLines(
      parsedLines[envKeys.ENV_VALUE]
    )

    this.template = parseEnvTemplate(parsedLines[envKeys.ENV_TEMPLATE])
    this.modes = parseEnvModes1(parsedLines[envKeys.ENV_MODE])
    this.values = parseEnvValues1(parsedLines[envKeys.ENV_VALUE])
  }
}

const environment = new EnvironmentHandler()

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

      environment.setFile(vscode.window.activeTextEditor)
      panel.webview.html = getWebviewContent()

      /* currentFile.edit((editBuilder) => {
        const pos = new vscode.Position(0, 0)
        const nxt = new vscode.Position(0, 1)

        editBuilder.replace()
        editBuilder.insert(pos, '\\')
        editBuilder.delete(new vscode.Range(pos, nxt))
      }) */

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

function getValuesArray(lines = []) {
  let key = envKeys.ENV_TEMPLATE

  return lines.reduce((sectionedLines, line) => {
    const hasNewKey = line.includes('// @')

    if (hasNewKey) {
      const newKey = Object.values(envKeys).find((envKey) =>
        line.includes(envKey)
      )

      key = newKey || key
    }

    const oldLines = sectionedLines[key] || []

    return { ...sectionedLines, [key]: [...oldLines, line] }
  }, {})
}

function formatGroupLines(lines) {
  let carriedLines = []

  const formattedLines = lines.reduce((sectionedLines, line) => {
    const hasNewKey = line.includes('// @')

    if (hasNewKey) {
      sectionedLines = carriedLines.length
        ? [...sectionedLines, carriedLines]
        : sectionedLines

      carriedLines = [line]
    } else {
      carriedLines = [...carriedLines, line]
    }

    return sectionedLines
  }, [])

  return carriedLines.length
    ? [...formattedLines, carriedLines]
    : formattedLines
}

const parseEnvTemplate = (lines) => {
  const values = lines.slice(1)
  const valuesInLine = values.join('\r\n')

  return parse(valuesInLine)
}

const parseEnvModes1 = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, ...values] = lines
    const valuesInLine = values.join('\r\n').replace('//', '')

    const cuttedMetadata = metadata.match(/\/\/ @env-mode:(\w+)\.(\w+)/)
    const [scope, key] = cuttedMetadata.slice(1)

    const carriedScopes = envModes[scope] || {}

    return {
      ...envModes,
      [scope]: { ...carriedScopes, [key]: parse(valuesInLine) },
    }
  }, {})
}

const parseEnvValues1 = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, valuesInLine] = lines
    const values = valuesInLine.replace('//', '').split(',')

    const cuttedMetadata = metadata.match(/\/\/ @env-value:(\w+)/)
    const [key] = cuttedMetadata.slice(1)

    return { ...envModes, [key]: values.map((value) => value.trim()) }
  }, {})
}

function getWebviewContent() {
  const { template, modes, values } = environment

  const envTemplateHTML = Object.keys(template).map((envKey) => {
    const value = template[envKey]
    const formattedValue = `${envKey}: `
    const hasInputSelect = values.hasOwnProperty(envKey)

    const input = !hasInputSelect
      ? `<input type="text" value="${value}"/>`
      : `<select>${values[envKey]
          .map((option) => `<option value="${option}">${option}</option>`)
          .join('')}</select>`

    return `
		<tr>
				<td>${formattedValue}</td>
				<td>${input}</td>
		</tr>
		`
  })

  const envModesHTML = Object.keys(modes).map((envKey) => {
    const values = modes[envKey]
    const formattedValue = `${envKey}: `
    const options = Object.keys(values)
      .map((option) => `<option value="${option}">${option}</option>`)
      .join('')

    return `
		<tr>
				<td>${formattedValue}</td>
				<td><select>${options}</select></td>
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

      <h2>Environment Modes</h2>

      <table>
          <tr>
              <th>MODE</th>
              <th>VALUE</th>
          </tr>
          ${envModesHTML.join('')}
      </table>

      <h2>Environment Values</h2>
			
      <table>
					<tr>
							<th>KEY</th>
							<th>VALUE</th>
					</tr>
					${envTemplateHTML.join('')}
			</table>
	</body>
	</html>
	`
}
