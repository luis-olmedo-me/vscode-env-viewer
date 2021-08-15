export const getWebviewContent = (fileContent) => {
  console.log('lo parseado', parse(fileContent))

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
	`
}
