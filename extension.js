const vscode = require('vscode')
const { parse } = require('dotenv')

let currentFile = null

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

      currentFile = vscode.window.activeTextEditor
      const fileContent = currentFile.document.getText()
      panel.webview.html = getWebviewContent(fileContent)

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

function getValues(allValues, key) {
  const toCut = `// @${key}`

  let shouldKeepLooking = true
  let envValues = []
  let carriedIndex = 0

  while (shouldKeepLooking) {
    const firstIndex = allValues.indexOf(toCut, carriedIndex)
    const lastIndex = allValues.indexOf('// @', firstIndex + 1)
    const validatedLastIndex = lastIndex !== -1 ? lastIndex : allValues.length

    const newValue = allValues
      .slice(firstIndex + toCut.length, validatedLastIndex)
      .trim()

    if (newValue) {
      carriedIndex = validatedLastIndex
      envValues = [...envValues, newValue]
    } else {
      shouldKeepLooking = false
    }
  }

  return envValues
}

const parseEnvValues = (values) => {
  return values.reduce((valuesAsObjects, value) => {
    const [formattedValue] = value.match(/\w.+/) || []
    const parsedValue = parse(formattedValue)
    const valueSplitted = Object.keys(parsedValue).reduce((values, key) => {
      const inlineValue = parsedValue[key]

      return { ...values, [key]: inlineValue.split(',') }
    }, {})

    return { ...valuesAsObjects, ...valueSplitted }
  }, {})
}

const parseEnvModes = (modes) => {
  return modes.reduce((envModes, mode) => {
    const [modeMetadata] = mode.match(/\w.+/) || ['']
    const [key, value] = modeMetadata.split('.')
    const carriedEnvKeyValues = envModes[key] || {}
    const carriedEnvValues = carriedEnvKeyValues[value] || {}

    const envValues = mode
      .replace(`:${modeMetadata}`, '')
      .replace(/^\/\//gm, '')
    const parsedValue = parse(envValues)

    return {
      ...envModes,
      [key]: {
        ...carriedEnvKeyValues,
        [value]: { ...carriedEnvValues, ...parsedValue },
      },
    }
  }, {})
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

function getWebviewContent(fileContent) {
  const lines = fileContent.split('\r\n')
  const parsedLines = getValuesArray(lines)

  parsedLines[envKeys.ENV_MODE] = formatGroupLines(
    parsedLines[envKeys.ENV_MODE]
  )

  parsedLines[envKeys.ENV_VALUE] = formatGroupLines(
    parsedLines[envKeys.ENV_VALUE]
  )

  const envTemplate = parseEnvTemplate(parsedLines[envKeys.ENV_TEMPLATE])
  const envModes = parseEnvModes1(parsedLines[envKeys.ENV_MODE])
  const envValues = parseEnvValues1(parsedLines[envKeys.ENV_VALUE])

  const envTemplateHTML = Object.keys(envTemplate).map((envKey) => {
    const value = envTemplate[envKey]
    const formattedValue = `${envKey}: `
    const hasInputSelect = envValues.hasOwnProperty(envKey)

    const input = !hasInputSelect
      ? `<input type="text" value="${value}"/>`
      : `<select>${envValues[envKey]
          .map((option) => `<option value="${option}">${option}</option>`)
          .join('')}</select>`

    return `
		<tr>
				<td>${formattedValue}</td>
				<td>${input}</td>
		</tr>
		`
  })

  const envModesHTML = Object.keys(envModes).map((envKey) => {
    const values = envModes[envKey]
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
