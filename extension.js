const { basename } = require('path')
const vscode = require('vscode')
const { parse } = require('dotenv')

class EnvironmentHandler {
  constructor() {
    this.init()
  }

  init() {
    this.panel = null
    this.file = null
    this.lines = []
    this.template = {}
    this.modes = {}
    this.values = {}
    this.blockedKeys = []
    this.recentChanges = {}
    this.modeRecentChanged = ''
    this.filterKey = ''
    this.filterMode = ''
  }

  setPanel(panel, context) {
    this.panel = panel

    panel.webview.onDidReceiveMessage(
      handleDidReceiveMessage,
      undefined,
      context.subscriptions
    )

    panel.onDidDispose(() => (this.panel = null), null, context.subscriptions)
  }

  setFile(file) {
    const fileContent = file.document.getText()

    this.file = file
    this.lines = fileContent.split(jumpline)

    this.readEnvironment()
  }

  readEnvironment() {
    const parsedLines = getValuesArray(this.lines)

    parsedLines[envKeys.ENV_MODE] = formatGroupLines(
      parsedLines[envKeys.ENV_MODE] || []
    )

    parsedLines[envKeys.ENV_VALUE] = formatGroupLines(
      parsedLines[envKeys.ENV_VALUE] || []
    )

    this.template = parseEnvTemplate(parsedLines[envKeys.ENV_TEMPLATE])
    this.modes = parseEnvModes(parsedLines[envKeys.ENV_MODE])
    this.values = parseEnvValues(parsedLines[envKeys.ENV_VALUE])

    this.blockedKeys = Object.keys(this.values).reduce((blockedKeys, key) => {
      const value = this.values[key]

      return value.constant ? [...blockedKeys, key] : blockedKeys
    }, [])
  }

  updateEnvironment({ envType, envKey, scope, value }) {
    switch (envType) {
      case envKeys.ENV_VALUE: {
        const change = removeBlockedChanges(
          { [envKey]: value },
          this.blockedKeys
        )

        this.template[envKey] = value
        this.modeRecentChanged = ''
        this.recentChanges = change
        break
      }

      case envKeys.ENV_MODE: {
        const changes = removeBlockedChanges(
          this.modes[scope][value],
          this.blockedKeys
        )

        this.template = { ...this.template, ...changes }
        this.modeRecentChanged = scope
        this.recentChanges = this.modes[scope][value]
        break
      }
    }

    const templateIndex =
      this.lines.findIndex((line) => line.includes('// @env-template')) + 1

    this.file
      .edit((editBuilder) => {
        Object.keys(this.template).forEach((key, index) => {
          const line = this.file.document.lineAt(templateIndex + index).text

          const linePosition = new vscode.Position(templateIndex + index, 0)
          const linePositionEnd = new vscode.Position(
            templateIndex + index,
            line.length
          )

          const value = this.template[key]

          editBuilder.replace(
            new vscode.Range(linePosition, linePositionEnd),
            `${key}=${value}`
          )
        })
      })
      .then(() => {
        this.file.document.save().then(() => {
          this.setFile(this.file)
          this.updatePanel()
        })
      })
  }

  updatePanel() {
    this.panel.webview.html = getWebviewContent()
  }

  handleOnExternalSave(file) {
    const isSameFile = this.file.document.uri.path === file.uri.path

    if (isSameFile) {
      this.setFile(this.file)
      this.updatePanel()
    }
  }

  handleOnExternalClose(file) {
    const isSameFile = this.file.document.uri.path === file.uri.path

    if (isSameFile) {
      this.panel.dispose()
      this.init()
    }
  }

  filterByKey({ value: filterKey }) {
    this.filterKey = filterKey
    this.updatePanel()
  }

  filterByMode({ value: filterMode }) {
    this.filterMode = filterMode
    this.updatePanel()
  }
}

const environment = new EnvironmentHandler()

const envKeys = {
  ENV_TEMPLATE: 'env-template',
  ENV_MODE: 'env-mode',
  ENV_VALUE: 'env-value',
}

const jumplines = {
  win32: '\r\n',
  default: '\n',
}

const jumpline = jumplines[process.platform] || jumplines.default

const eventKeys = {
  CHANGED_VALUE: 'env-viewer.changedValueEvent',
  FILTER_BY_KEY: 'env-viewer.filterByKey',
  FILTER_BY_MODE: 'env-viewer.filterByMode',
  OPEN_PREVIEW: 'env-viewer.openPreviewToTheSide',
}

const inputs = {
  SELECT: 'select',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  TEXT: 'text',
}

const inputOptions = {
  DISABLED: 'disabled',
  CONSTANT: 'constant',
}

function handleDidReceiveMessage(message) {
  switch (message.command) {
    case eventKeys.CHANGED_VALUE:
      environment.updateEnvironment(message.data)
      break
    case eventKeys.FILTER_BY_KEY:
      environment.filterByKey(message.data)
      break
    case eventKeys.FILTER_BY_MODE:
      environment.filterByMode(message.data)
      break
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const interpretateCommand = vscode.commands.registerCommand(
    eventKeys.OPEN_PREVIEW,
    function openPreview() {
      const activeTextEditor = vscode.window.activeTextEditor
      const isDifferentFile = environment.file !== activeTextEditor

      environment.setFile(activeTextEditor)

      if (!environment.panel) {
        const panel = vscode.window.createWebviewPanel(
          'editor',
          basename(activeTextEditor.document.fileName),
          vscode.ViewColumn.Two,
          { enableScripts: true }
        )

        environment.setPanel(panel, context)
        environment.updatePanel()
      } else if (isDifferentFile) {
        environment.panel.title = basename(activeTextEditor.document.fileName)
        environment.updatePanel()
      } else {
        environment.panel.reveal(2)
      }
    }
  )

  const didSaveTextEvent = vscode.workspace.onDidSaveTextDocument((file) =>
    environment.handleOnExternalSave(file)
  )

  const didCloseTextEvent = vscode.workspace.onDidCloseTextDocument((file) =>
    environment.handleOnExternalClose(file)
  )

  context.subscriptions.push(
    interpretateCommand,
    didSaveTextEvent,
    didCloseTextEvent
  )
}

module.exports = {
  activate,
}

function removeBlockedChanges(changes, blockedKeys) {
  return Object.keys(changes).reduce((changesKept, key) => {
    const change = changes[key]

    return blockedKeys.includes(key)
      ? changesKept
      : { ...changesKept, [key]: change }
  }, {})
}

function getValuesArray(lines = []) {
  let key = envKeys.ENV_TEMPLATE

  return lines.reduce((sectionedLines, line) => {
    const hasNewKey = line.includes('// @')

    if (hasNewKey) {
      const newKey = Object.values(envKeys).find((envKey) =>
        line.includes(envKey)
      )

      if (!newKey) {
        vscode.window.showErrorMessage(`Error: Unknown env tag \"${line}\"`)

        return sectionedLines
      }

      key = newKey
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
  const valuesInLine = values.join(jumpline)

  return parse(valuesInLine)
}

const parseEnvModes = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, ...values] = lines
    const valuesInLine = values
      .map((value) => value.replace('//', ''))
      .join(jumpline)

    const cuttedMetadata = metadata.match(/\/\/ @env-mode:(\w+)\.(\w+)/)

    if (!cuttedMetadata) {
      vscode.window.showErrorMessage(
        `Error: Env tag wrong typed \"${metadata}\"`
      )

      return envModes
    }

    const [scope, key] = cuttedMetadata.slice(1)

    const carriedScopes = envModes[scope] || {}

    return {
      ...envModes,
      [scope]: { ...carriedScopes, [key]: parse(valuesInLine) },
    }
  }, {})
}

function getOptions(optionsString = '', defaultType) {
  const types = Object.values(inputs)
  const allowedOptions = Object.values(inputOptions)

  return optionsString.split(' ').reduce(
    (options, option) => {
      const isType = types.includes(option)
      const isKnownOption = allowedOptions.includes(option)

      if (isType) {
        return { ...options, type: option }
      } else if (isKnownOption) {
        return { ...options, [option]: true }
      }

      return options
    },
    { type: defaultType }
  )
}

const parseEnvValues = (setOfLines) => {
  return setOfLines.reduce((envModes, lines) => {
    const [metadata, valuesInLine] = lines
    const values = valuesInLine.replace('//', '').split(',')

    const cuttedMetadata =
      metadata.match(/\/\/ @env-value:\((.+)\)\((.+)\)/) ||
      metadata.match(/\/\/ @env-value:(\w+)\((.+)\)/) ||
      metadata.match(/\/\/ @env-value:\((.+)\)/) ||
      metadata.match(/\/\/ @env-value:(\w+)/)

    if (!cuttedMetadata) {
      vscode.window.showErrorMessage(
        `Error: Env tag wrong typed \"${metadata}\"`
      )

      return envModes
    }

    const [keys, optionsInRow] = cuttedMetadata.slice(1)
    const parsedValues = values.map((value) => value.trim()).filter(Boolean)
    const options = getOptions(
      optionsInRow,
      parsedValues.length ? inputs.SELECT : inputs.TEXT
    )

    const parsedKeys = keys.split(',').reduce((result, key) => {
      return {
        ...result,
        [key]: {
          values: parsedValues,
          ...options,
        },
      }
    }, {})

    return {
      ...envModes,
      ...parsedKeys,
    }
  }, {})
}

const getEventFunction = ({ envType, envKey = null, scope = null }) => {
  return `
  (function() {
    const defaultValue = typeof event.target.dataset.defaultValue === 'string' ? event.target.dataset.defaultValue : event.target.value
    const value = event.target.value || defaultValue

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

const getFilterEventFunction = (filterKey) => {
  return `
  (function() {
    const value = event.target.value

    vscode.postMessage({
      command: '${filterKey}',
      data: { value }
    })
  }())
  `
}

function checkModeSelected(allValues, mode) {
  return Object.keys(mode).every((key) => mode[key] === allValues[key])
}

const getDefaultOption = (value = 'Custom') => {
  return `<option selected disabled>${value}</option>`
}

function getInput({
  commonProps,
  selectOptions,
  value,
  customInput: { type, values, ...optionsRest },
}) {
  const options = optionsRest || {}
  const disablation =
    options[inputOptions.DISABLED] || options[inputOptions.CONSTANT]
      ? 'disabled'
      : ''

  const blocker = options[inputOptions.CONSTANT]
    ? 'data-is-constant="true"'
    : ''
  const optionsInLine = `${disablation} ${blocker}`

  switch (type) {
    case inputs.SELECT:
      return `<select ${commonProps} ${optionsInLine}>${selectOptions.join()}</select>`

    case inputs.BOOLEAN:
      const [firstOption, lastOption] = values

      const isSelected = firstOption === value
      const nextValue = isSelected ? lastOption : firstOption
      const selection = isSelected ? 'checked' : ''

      return `
      <div class="checkbox-wrapper">
        <input class="checkbox" type="checkbox" ${commonProps} value="${nextValue}" ${optionsInLine}/>
        <input class="input" value="${value}" ${optionsInLine}/>
        <span class="check ${selection}"></span>
      </div>
      `

    case inputs.NUMBER:
      const numberValue = Number(value)

      return `<input type="number" ${commonProps} value="${numberValue}" ${optionsInLine} data-default-value="0"/>`

    case inputs.TEXT:
    default:
      return `<input type="text" ${commonProps} ${optionsInLine} value="${value}"/>`
  }
}

function getWebviewContent() {
  const { modes, values, filterKey, filterMode, template, modeRecentChanged } =
    environment

  const envTemplateHTML = Object.keys(template).map((envKey) => {
    const shouldKeepEnv = filterKey
      ? envKey.toLowerCase().includes(filterKey.toLowerCase())
      : true

    if (!shouldKeepEnv) return ''

    const value = template[envKey]
    const customInput = values[envKey]

    const eventData = { envType: envKeys.ENV_VALUE, envKey }
    const handleOnChange = getEventFunction(eventData)
    const commonProps = `onChange="${handleOnChange}" class="input"`
    const hasBeenChanged = environment.recentChanges.hasOwnProperty(envKey)

    let selectOptions = []
    let customRow = ''

    if (customInput && customInput.type === inputs.SELECT) {
      const hasSelectedOptions = customInput.values.some(
        (option) => value === option
      )

      selectOptions = customInput.values.map((option) => {
        const isSelected = value === option
        const selection = isSelected ? 'selected' : ''

        return `<option ${selection} value="${option}">${option}</option>`
      })

      selectOptions = !hasSelectedOptions
        ? [...selectOptions, getDefaultOption(value)]
        : selectOptions

      customRow = !hasSelectedOptions ? `class="custom"` : ''
    }

    customRow = hasBeenChanged ? 'class="changed"' : customRow
    customRow =
      customInput && customInput.constant
        ? `${customRow} data-is-constant="true"`
        : customRow

    const input = getInput({
      customInput: customInput || {},
      commonProps,
      selectOptions,
      value,
    })

    return `
		<tr>
				<td>${envKey}:</td>
				<td ${customRow}>${input}</td>
		</tr>
		`
  })

  const envModesHTML = Object.keys(modes).map((envKey) => {
    const shouldKeepEnv = filterMode
      ? envKey.toLowerCase().includes(filterMode.toLowerCase())
      : true

    if (!shouldKeepEnv) return ''

    const values = modes[envKey]

    const hasSelectedOptions = Object.keys(values).some((option) =>
      checkModeSelected(template, values[option])
    )
    let options = Object.keys(values).map((option) => {
      const value = values[option]
      const isSelected = checkModeSelected(template, value)
      const selection = isSelected ? 'selected' : ''

      return `<option ${selection} value="${option}">${option}</option>`
    })
    options = !hasSelectedOptions ? [...options, getDefaultOption()] : options

    const eventData = { envType: envKeys.ENV_MODE, scope: envKey }
    const handleOnChange = getEventFunction(eventData)

    let customRow = !hasSelectedOptions ? 'class="custom"' : ''
    customRow = modeRecentChanged === envKey ? 'class="changed"' : customRow

    return `
		<tr>
				<td>${envKey}:</td>
				<td ${customRow} ><select class="input" onChange="${handleOnChange}">${options.join()}</select></td>
		</tr>
		`
  })

  const hasModes = Boolean(Object.keys(modes).length)
  const hasValues = Boolean(Object.keys(template).length)

  const modesTable = hasModes
    ? `
    <h2 class="sub-title">Modes</h2>
    <hr />
    <input
      class="input search"
      type="text"
      placeholder="Search by mode"
      onchange="${getFilterEventFunction(eventKeys.FILTER_BY_MODE)}"
      value="${filterMode}"
    />

    <table class="table">
        <tr>
            <th>MODE</th>
            <th>VALUE</th>
        </tr>
        ${envModesHTML.join('')}
    </table>
  `
    : ''

  const valuesTable = hasValues
    ? `
    <h2 class="sub-title">Values</h2>
    <hr />
    <input
      class="input search"
      type="text"
      placeholder="Search by key"
      onchange="${getFilterEventFunction(eventKeys.FILTER_BY_KEY)}"
      value="${filterKey}"
    />

    <table class="table">
        <tr>
            <th>VARIABLE</th>
            <th>VALUE</th>
        </tr>
        ${envTemplateHTML.join('')}
    </table>
  `
    : ''

  return `
	<!DOCTYPE html>

	<html lang="en">
	<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getStyles()}</style>
			<title>Env Editor</title>
	</head>
	<body>
			<h1 class="title">Environment Editor</h1>

      ${modesTable}

      ${valuesTable}

      <hr/>
      <footer><a href="https://github.com/olmedoluis/vscode-env-viewer">vscode-env-viewer</a></footer>

      <script>
        const vscode = acquireVsCodeApi();
      </script>
	</body>
	</html>
	`
}

function getStyles() {
  return `
    body,
    input,
    select {
      font-family: var(--vscode-editor-font-family);
    }

    .title {
      text-align: center;
    }

    .sub-title {
      margin: 0 0 10px;
    }

    .table,
    .input {
      width: 100%;
    }

    .input[disabled] {
      background-color: var(--vscode-inputOption-activeBackground);
      opacity: 1;
    }

    .table {
      margin-bottom: 30px;
    }

    .table td {
      width: 50vw;
      word-break: break-word;
    }

    .table td:last-child {
      padding-left: 10px;
      background: var(--vscode-gitDecoration-ignoredResourceForeground);
      border-radius: 3px;
    }
    
    .table td.custom:last-child {
      background: var(--vscode-gitDecoration-modifiedResourceForeground);
    }

    .table td.changed:last-child {
      background: var(--vscode-gitDecoration-addedResourceForeground);
    }

    .table td.changed[data-is-constant="true"] {
      background: var(--vscode-gitDecoration-untrackedResourceForeground);
    }

    .table td:last-child:focus-within {
      background: var(--vscode-gitDecoration-renamedResourceForeground);
    }
    
    .input {
      box-sizing: border-box;
      border: none;
      border-radius: 3px;
      padding: 4px 5px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
    }

    select.input {
      padding: 4px 1px;
    }
    
    .checkbox-wrapper {
      position: relative;
    }
    .checkbox-wrapper .checkbox {
      position: absolute;
      width: 100%;
      margin: 0;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 1;
      cursor: unset;
    }
    .checkbox-wrapper .checkbox[disabled] {
      display: none;
    }
    .check {
      position: absolute;
      width: 11px;
      height: 50%;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border-radius: 3px;
      background-color: var(--vscode-checkbox-foreground);
    }
    .check.checked {
      background-color: var(--vscode-editorOverviewRuler-infoForeground);
    }

    .input.search {
      margin: 3px 0;
    }

    .input:focus{
      outline: none;
    }
    
    .table tr:focus-within,
    .table tr:focus-within input {
      color: var(--vscode-menu-selectionForeground);
    }

    footer {
      padding: 50px 0;
    }

    footer a {
      display: block;
      text-align: center;
    }
  `
}
