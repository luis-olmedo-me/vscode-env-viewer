const vscode = require('vscode')
const { parse } = require('dotenv')

class EnvironmentHandler {
  constructor() {
    this.file = null
    this.lines = []
    this.template = {}
    this.modes = {}
    this.values = {}
    this.overwritten = {}
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
    this.overwritten = parseEnvTemplate(parsedLines[envKeys.ENV_OVERWRITTEN])
    this.modes = parseEnvModes(parsedLines[envKeys.ENV_MODE])
    this.values = parseEnvValues(parsedLines[envKeys.ENV_VALUE])

    this.overwritten = { ...this.template, ...this.overwritten }
  }

  updateEnvironment({ envType, envKey, scope, value }) {
    switch (envType) {
      case envKeys.ENV_VALUE:
        this.overwritten[envKey] = value
        break

      case envKeys.ENV_MODE:
        this.overwritten = { ...this.overwritten, ...this.modes[scope][value] }
        break
    }

    const overwrittenIndex =
      this.lines.findIndex((line) => line.includes('// @env-overwritten')) + 1

    this.file
      .edit((editBuilder) => {
        Object.keys(this.overwritten).forEach((key, index) => {
          const line = this.file.document.lineAt(overwrittenIndex + index).text

          const linePosition = new vscode.Position(overwrittenIndex + index, 0)
          const linePositionEnd = new vscode.Position(
            overwrittenIndex + index,
            line.length
          )

          const value = this.overwritten[key]

          editBuilder.replace(
            new vscode.Range(linePosition, linePositionEnd),
            `${key}=${value}`
          )
        })
      })
      .then(() => {
        this.file.document.save()
        this.setFile(this.file)
      })
  }
}

const environment = new EnvironmentHandler()

const envKeys = {
  ENV_TEMPLATE: 'env-template',
  ENV_MODE: 'env-mode',
  ENV_VALUE: 'env-value',
  ENV_OVERWRITTEN: 'env-overwritten',
}

const eventKeys = {
  CHANGED_VALUE: 'env-viewer.changedValueEvent',
  OPEN_PREVIEW: 'env-viewer.openPreviewToTheSide',
}

function handleDidReceiveMessage(message) {
  switch (message.command) {
    case eventKeys.CHANGED_VALUE:
      environment.updateEnvironment(message.data)
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let interpretateCommand = vscode.commands.registerCommand(
    eventKeys.OPEN_PREVIEW,
    function () {
      const panel = vscode.window.createWebviewPanel(
        'editor',
        vscode.window.activeTextEditor.document.fileName,
        vscode.ViewColumn.Two,
        { enableScripts: true }
      )

      environment.setFile(vscode.window.activeTextEditor)
      panel.webview.html = getWebviewContent()

      panel.webview.onDidReceiveMessage(
        handleDidReceiveMessage,
        undefined,
        context.subscriptions
      )
    }
  )

  context.subscriptions.push(interpretateCommand)
}

module.exports = {
  activate,
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

const parseEnvModes = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, ...values] = lines
    const valuesInLine = values
      .map((value) => value.replace('//', ''))
      .join('\r\n')

    const cuttedMetadata = metadata.match(/\/\/ @env-mode:(\w+)\.(\w+)/)
    const [scope, key] = cuttedMetadata.slice(1)

    const carriedScopes = envModes[scope] || {}

    return {
      ...envModes,
      [scope]: { ...carriedScopes, [key]: parse(valuesInLine) },
    }
  }, {})
}

const parseEnvValues = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, valuesInLine] = lines
    const values = valuesInLine.replace('//', '').split(',')

    const cuttedMetadata = metadata.match(/\/\/ @env-value:(\w+)/)
    const [key] = cuttedMetadata.slice(1)

    return { ...envModes, [key]: values.map((value) => value.trim()) }
  }, {})
}

const getEventFunction = ({ envType, envKey = null, scope = null }) => {
  return `
  (function() {
    const value = event.target.value
    const envType = '${envType}'
    const envKey = '${envKey}'
    const scope = '${scope}'

    vscode.postMessage({
      command: '${eventKeys.CHANGED_VALUE}',
      data: { envType, envKey, scope, value }
    })
  }())
  `
}

function getWebviewContent() {
  const { template, modes, values, overwritten } = environment
  const realValues = { ...template, ...overwritten }

  const envTemplateHTML = Object.keys(realValues).map((envKey) => {
    const value = realValues[envKey]
    const formattedValue = `${envKey}: `
    const hasInputSelect = values.hasOwnProperty(envKey)

    const eventData = { envType: envKeys.ENV_VALUE, envKey }
    const commonProps = `onChange="${getEventFunction(eventData)}"`

    const input = !hasInputSelect
      ? `<input type="text" ${commonProps} value="${value}"/>`
      : `<select ${commonProps}>${values[envKey]
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

    const eventData = { envType: envKeys.ENV_MODE, scope: envKey }

    return `
		<tr>
				<td>${formattedValue}</td>
				<td><select onChange="${getEventFunction(eventData)}">${options}</select></td>
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

      <script>
        const vscode = acquireVsCodeApi();
      </script>
	</body>
	</html>
	`
}
