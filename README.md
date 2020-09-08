# D3 X Tableau

### Files:
1. first-test.trex
<br>The extension manifest file that contains metadata for the extension and is used for registration.
- `<source-location>`: Contains the url of the server that hosts the web page you create that interacts with Tableau.
- `<url>`: Specifies the scheme (HTTPS, HTTTP), the name of the server, the port (optional) and the path to extension (optional). The url must use HTTPS.
<br> ```<source-location>
  <url>http://localhost:8765/Initiative/first-test/index.html</url></source-location>```
- `<icon>`: If specified, the icon is what appears in the About dialog box. The icon must be a 70x70 pixel PNG file that is Base64 encoded. (I used their example icon).

2. index.html
3. quadrant-chart.js
4. style.css

### Useful Links:
- [Get Started with Dashboard Extensions](https://tableau.github.io/extensions-api/docs/trex_getstarted.html)
- [HTTPS and security requirements](https://tableau.github.io/extensions-api/docs/trex_security.html)
- [Get data from a worksheet](https://tableau.github.io/extensions-api/docs/trex_getdata.html)
- [Publish a Dashboard Extension](https://tableau.github.io/extensions-api/docs/trex_publish.html)
- [Debug Extensions in Tableau Desktop](https://tableau.github.io/extensions-api/docs/trex_debugging.html#download-the-chromium-browser)
