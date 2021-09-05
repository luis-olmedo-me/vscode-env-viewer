<!--
repo name: ENV Variable
description: An interpreter for environment variable files.
github name:  olmedoluis
link: https://github.com/olmedoluis/vscode-env-viewer
email: olmedoluis012@gmail.com
-->

<!-- PROJECT SHIELDS -->

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- [![LinkedIn][linkedin-shield]][linkedin-url] -->

<!-- PROJECT LOGO -->
<br />
<p align="center">
    <a href="https://github.com/olmedoluis/vscode-env-viewer">
        <img src="https://github.com/olmedoluis/vscode-env-viewer/blob/main/media/logo/seahorse.png" alt="Logo" width="80" height="80">
    </a>
<h3 align="center"><a href="https://github.com/olmedoluis/vscode-env-viewer">ENV Viewer</a></h3>
    <p align="center">
        An awesome readme Template extension to quickstart your project
        <br />
        <a href="https://marketplace.visualstudio.com/items?itemName=oGranny.md-template"><strong>Visual studio market place 📃</strong></a>
        <br />
        <br />
        <a href="//github.com/Md-Template/ oGranny">View Demo</a>
        •
        <a href="https://github.com/olmedoluis/vscode-env-viewer/issues">Report Bug</a>
        •
        <a href="https://github.com/olmedoluis/vscode-env-viewer/issues">Request Feature</a>
    </p>
</p>

<!-- TABLE OF CONTENTS -->

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About The Project](#about-the-project)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

<!-- ABOUT THE PROJECT -->

## About The Project

Couldn't find a better way to organize environment variables than create an extension by my self. Even separating the variables with comments or also explaining with comments too, it never got better.

With this extension may take some time to set up the proper values but it lets you see what you're applying or if some values got overwritten explicitly and that was what I was looking for.

Once you get it ready you'll just need to select your modes/values by dropdown selection and that's it. Nothing about searching for those variables that are never close to each other.

### Built With

- [yo]()
- [vsce]()
- [dotenv]()

<!-- GETTING STARTED -->

## Getting Started

- Download the extension
- Go to your .env file
- Once you focus on your .env file, click on the magnifying glass icon at the top right menu
- Enjoy of easily change environment values

### Prerequisites

- [VS Code](https://code.visualstudio.com)

### Installation

download this extension directly from VS code [marketplace](https://marketplace.visualstudio.com/vscode)

<!-- USAGE EXAMPLES -->

## Usage

- There is 4 @ tags that you can use:
  - @env-template: This should be the default values you'll use.
  - @env-values: This should be the values that an environment variable can take.
  - @env-modes: This is a set of environment variables.
  - @env-overwritten: This are the applied values.

Example:

```dotenv
// @env-template
ENV=test
BASIC_URL="www.coso.coam"


//---------------------------------------
// @env-mode:ENVIRONMENT.test
//    ENV=test
//    BASIC_URL="www.url.com"
//---------------------------------------
// @env-mode:ENVIRONMENT.prod
//    ENV=prod
//    BASIC_URL="www.url2.com"
//---------------------------------------


//---------------------------------------
// @env-value:ENV
//    test,prod
//---------------------------------------


// @env-overwritten
ENV=test
BASIC_URL=www.url2.com
```

<!-- ROADMAP -->

## Roadmap

See the [open issues](https://github.com/olmedoluis/vscode-env-viewer/issues) for a list of proposed features (and known issues).

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- CONTACT -->

## Contact

Luis Olmedo - olmedoluis012@gmail.com

Project Link: [https://github.com/olmedoluis/vscode-env-viewer](https://github.com/olmedoluis/vscode-env-viewer)

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/olmedoluis/vscode-env-viewer.svg?style=flat-square
[contributors-url]: https://github.com/olmedoluis/vscode-env-viewer/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/olmedoluis/vscode-env-viewer.svg?style=flat-square
[forks-url]: https://github.com/olmedoluis/vscode-env-viewer/network/members
[stars-shield]: https://img.shields.io/github/stars/olmedoluis/vscode-env-viewer.svg?style=flat-square
[stars-url]: https://github.com/olmedoluis/vscode-env-viewer/stargazers
[issues-shield]: https://img.shields.io/github/issues/olmedoluis/vscode-env-viewer.svg?style=flat-square
[issues-url]: https://github.com/olmedoluis/vscode-env-viewer/issues
[license-shield]: https://img.shields.io/github/license/olmedoluis/vscode-env-viewer.svg?style=flat-square
[license-url]: https://github.com/olmedoluis/vscode-env-viewer/blob/master/LICENSE.txt
[product-screenshot]: images/screenshot.png
